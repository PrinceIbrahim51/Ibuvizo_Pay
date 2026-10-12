package com.ibuvio.pay.shop;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ShopProfileRepository extends JpaRepository<ShopProfile, UUID> {}
