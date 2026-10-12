package com.ibuvio.pay.shop;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "shop_profiles")
public class ShopProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "shop_name", nullable = false)
    private String shopName;

    private String gstin;

    @Column(nullable = false)
    private String category;

    @Column(name = "default_gst", nullable = false)
    private int defaultGst;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ShopProfile() {}

    public ShopProfile(UUID userId) {
        this.userId = userId;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public String getShopName() { return shopName; }
    public void setShopName(String shopName) { this.shopName = shopName; }
    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public int getDefaultGst() { return defaultGst; }
    public void setDefaultGst(int defaultGst) { this.defaultGst = defaultGst; }
}
