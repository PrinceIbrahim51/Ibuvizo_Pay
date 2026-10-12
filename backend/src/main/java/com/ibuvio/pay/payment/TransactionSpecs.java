package com.ibuvio.pay.payment;

import java.util.Locale;
import java.util.UUID;

import org.springframework.data.jpa.domain.Specification;

/** Typed, parameterised filters (no string-built SQL). The userId filter is always applied. */
final class TransactionSpecs {

    private TransactionSpecs() {}

    static Specification<Transaction> forUser(UUID userId, Direction direction, TxnStatus status, String q) {
        Specification<Transaction> spec = (root, query, cb) -> cb.equal(root.get("userId"), userId);
        if (direction != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("direction"), direction));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (q != null && !q.isBlank()) {
            String like = "%" + escape(q.toLowerCase(Locale.ROOT)) + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("counterpartyName")), like, '\\'),
                    cb.like(cb.lower(root.get("counterpartyVpa")), like, '\\'),
                    cb.like(cb.lower(root.get("note")), like, '\\')));
        }
        return spec;
    }

    /** Escape LIKE wildcards so a search for "%" cannot match everything. */
    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
