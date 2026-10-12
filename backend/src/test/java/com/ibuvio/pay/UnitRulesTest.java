package com.ibuvio.pay;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.ibuvio.pay.savings.RoundUp;
import com.ibuvio.pay.shop.Gst;

class UnitRulesTest {

    @Test
    void roundUp() {
        assertThat(RoundUp.spareChange(23700, 10)).isEqualTo(300);
        assertThat(RoundUp.spareChange(24000, 10)).isZero();
        assertThat(RoundUp.spareChange(23750, 100)).isEqualTo(6250);
    }

    @Test
    void gstIsExtractedFromInclusiveAmount() {
        assertThat(Gst.taxIn(105000, 5)).isEqualTo(5000);
        assertThat(Gst.taxIn(118000, 18)).isEqualTo(18000);
        assertThat(Gst.taxIn(50000, 0)).isZero();
    }

    @Test
    void csvCellsCannotCarryFormulas() throws Exception {
        var m = com.ibuvio.pay.shop.ShopService.class.getDeclaredMethod("csv", String.class);
        m.setAccessible(true);
        assertThat(m.invoke(null, "=HYPERLINK(\"http://evil\")")).isEqualTo("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    }
}
