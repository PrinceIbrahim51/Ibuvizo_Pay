package com.ibuvio.pay.user;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByPhone(String phone);

    Optional<User> findByVpaIgnoreCase(String vpa);

    boolean existsByPhone(String phone);

    boolean existsByVpaIgnoreCase(String vpa);

    Page<User> findByPhoneContaining(String phone, Pageable pageable);
}
