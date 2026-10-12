package com.ibuvio.pay.bank;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ibuvio.pay.audit.AuditService;
import com.ibuvio.pay.bank.BankDtos.AccountResponse;
import com.ibuvio.pay.bank.BankDtos.LinkAccountRequest;
import com.ibuvio.pay.common.ApiException;
import com.ibuvio.pay.config.AppProperties;
import com.ibuvio.pay.security.CryptoService;

@Service
public class BankService {

    static final int MAX_ACCOUNTS = 5;

    private final BankAccountRepository accounts;
    private final PspGateway psp;
    private final CryptoService crypto;
    private final AuditService audit;
    private final AppProperties props;

    public BankService(BankAccountRepository accounts, PspGateway psp, CryptoService crypto, AuditService audit,
                       AppProperties props) {
        this.accounts = accounts;
        this.psp = psp;
        this.crypto = crypto;
        this.audit = audit;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> list(UUID userId) {
        return accounts.findByUserIdOrderByCreatedAtAsc(userId).stream().map(AccountResponse::from).toList();
    }

    @Transactional
    public AccountResponse link(UUID userId, LinkAccountRequest req) {
        SupportedBank bank = SupportedBank.of(req.bankCode())
                .orElseThrow(() -> ApiException.badRequest("BANK_UNSUPPORTED", "This bank is not supported yet"));
        if (!req.ifsc().startsWith(bank.ifscPrefix())) {
            throw ApiException.badRequest("IFSC_MISMATCH", "IFSC does not belong to the selected bank");
        }
        long existing = accounts.countByUserId(userId);
        if (existing >= MAX_ACCOUNTS) {
            throw ApiException.badRequest("ACCOUNT_LIMIT", "You can link up to " + MAX_ACCOUNTS + " accounts");
        }
        String number = req.accountNumber();
        BankAccount account = new BankAccount(userId, bank.name(), bank.displayName(), req.accountType(),
                crypto.encrypt(number), number.substring(number.length() - 4), req.ifsc());
        account.setPrimary(existing == 0);
        if ("sandbox".equalsIgnoreCase(props.psp().mode())) {
            account.setSandboxBalancePaise(props.psp().sandboxOpeningBalancePaise());
        }
        psp.setUpiPin(account, req.upiPin());
        accounts.save(account);
        audit.record(userId, "BANK_LINKED", bank.name() + " ****" + account.getAccountLast4());
        return AccountResponse.from(account);
    }

    @Transactional
    public AccountResponse makePrimary(UUID userId, UUID accountId) {
        BankAccount target = owned(userId, accountId);
        accounts.findByUserIdOrderByCreatedAtAsc(userId).forEach(a -> a.setPrimary(a.getId().equals(target.getId())));
        return AccountResponse.from(target);
    }

    @Transactional
    public void unlink(UUID userId, UUID accountId) {
        BankAccount account = owned(userId, accountId);
        accounts.delete(account);
        if (account.isPrimary()) {
            accounts.findByUserIdOrderByCreatedAtAsc(userId).stream()
                    .filter(a -> !a.getId().equals(accountId)).findFirst().ifPresent(a -> a.setPrimary(true));
        }
        audit.record(userId, "BANK_UNLINKED", account.getBankCode() + " ****" + account.getAccountLast4());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public long balance(UUID userId, UUID accountId, String upiPin) {
        BankAccount account = owned(userId, accountId);
        psp.verifyUpiPin(account, upiPin);
        return psp.balancePaise(account);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void changePin(UUID userId, UUID accountId, String currentPin, String newPin) {
        BankAccount account = owned(userId, accountId);
        psp.verifyUpiPin(account, currentPin);
        psp.setUpiPin(account, newPin);
        audit.record(userId, "UPI_PIN_CHANGED", account.getBankCode() + " ****" + account.getAccountLast4());
    }

    private BankAccount owned(UUID userId, UUID accountId) {
        return accounts.findByIdAndUserId(accountId, userId).orElseThrow(ApiException::notFound);
    }
}
