// ExcelProbe: nap mot file Excel cau hinh bang CHINH parser cua game server
// (EExcel.load + decode) va in ra tung field cua row dau moi sheet.
//
// Day la cach kiem chung mot file cau hinh gan nhat voi chay server that
// ma khong can MySQL/Mongo/RabbitMQ. Neu load() hoac decode() FAIL o day
// thi tren server cung se FAIL.
//
// BIEN DICH (JDK 8+; da test JDK 21), chay tu thu muc goc repo:
//   javac -proc:none -cp "server/game/tcg-game.jar;server/game/lib/*" -d build/probe tools/ExcelProbe.java
//
// CHAY (Windows dung ';' trong classpath, Linux dung ':'):
//   java -Dfile.encoding=UTF-8 -cp "server/game/tcg-game.jar;server/game/lib/*;build/probe" ExcelProbe <file.xlsx> <ExcelClass>
//
// VI DU:
//   ExcelProbe reconstructed/hero-week-card.xlsx com.ososx.tcg.game.activity.cycle.weekcard.hc.excel.HCExcel
//   ExcelProbe reconstructed/jade-shop.xlsx      com.ososx.tcg.game.res.jade.excel.JadeExcel
//   ExcelProbe reconstructed/friend-invite.xlsx  com.ososx.tcg.game.config.activity.friendinvite.FriendInviteExcel
//   ExcelProbe reconstructed/free-buy.xlsx       com.ososx.tcg.game.config.activity.cycle.freebuy.FreeBuyExcel
//   ExcelProbe reconstructed/rejiang-hero-starup.xlsx com.ososx.tcg.game.config.rejiang.RejiangHeroStarUpExcel
//
// Ten lop loader cua moi file: xem docs/missing-excel-reconstruction.md.
// Luu y: dung duong dan voi '/' (ke ca tren Windows) de tranh loi expand '\$' trong bash.
import java.io.File;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import com.ososx.tcg.game.config.EExcel;
import com.ososx.tcg.game.config.ESheet;

public class ExcelProbe {
  public static void main(String[] a) throws Exception {
    if (a.length != 2) { System.out.println("usage: ExcelProbe <file.xlsx> <ExcelClass>"); return; }
    File f = new File(a[0]);
    EExcel e = (EExcel) Class.forName(a[1]).getDeclaredConstructor().newInstance();
    System.out.println("== " + a[1].substring(a[1].lastIndexOf('.') + 1) + " expects '" + e.getFileName()
        + "'  file=" + f.getName() + " (" + f.length() + " bytes)");
    try { e.load(f); System.out.println("load(File): OK"); }
    catch (Throwable t) { System.out.println("load(File): FAIL " + t); return; }
    for (ESheet s : e.getSheets())
      System.out.println("  sheet '" + s.getSheetName() + "': " + (s.list == null ? "null" : s.list.size() + " row"));
    try { e.decode(); System.out.println("decode(): OK"); }
    catch (Throwable t) { System.out.println("decode(): FAIL " + t.getClass().getSimpleName() + ": " + t.getMessage()); }
    for (ESheet s : e.getSheets()) {
      if (s.list == null || s.list.isEmpty()) continue;
      Object r = s.list.get(0);
      StringBuilder sb = new StringBuilder();
      for (Class<?> k = r.getClass(); k != null && k != Object.class; k = k.getSuperclass())
        for (Field fd : k.getDeclaredFields()) {
          if (Modifier.isStatic(fd.getModifiers()) || fd.getName().equals("parent") || fd.getName().equals("rawValues")) continue;
          fd.setAccessible(true);
          Object v = fd.get(r);
          if (v instanceof Object[]) v = java.util.Arrays.toString((Object[]) v);
          sb.append(fd.getName()).append('=').append(v).append(' ');
        }
      System.out.println("  row[0] '" + s.getSheetName() + "': " + sb);
    }
  }
}
