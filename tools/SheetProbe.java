// SheetProbe: nap MOT sheet cu the qua ESheet.load(XSSFSheet) + decode() cua game,
// in row[0]. Dung khi loader ca workbook (vd PayExcel) khong tu thoat, hoac chi muon
// kiem mot sheet vua chen. Ten sheet lay tu class (getSheetName) -> KHONG truyen tieng
// Trung qua dong lenh (Git Bash -> Java se thanh "????" va glob khop ten thu muc).
//
//   javac -proc:none -cp "server/game/tcg-game.jar;server/game/lib/*" -d build/probe tools/SheetProbe.java
//   timeout 120 java -Dfile.encoding=UTF-8 -cp "server/game/tcg-game.jar;server/game/lib/*;build/probe" //        SheetProbe <file.xlsx> <SheetClass> [<SheetClass> ...]
//   vd: SheetProbe server/excel/release/recharge-benefit.xlsx com.ososx.tcg.game.config.pay.sheet.XyFundSheet
import java.io.*; import java.lang.reflect.*; import org.apache.poi.xssf.usermodel.*;
import com.ososx.tcg.game.config.*;
public class SheetProbe { public static void main(String[] a) throws Exception {
  XSSFWorkbook wb = new XSSFWorkbook(new FileInputStream(a[0]));
  for (int i=1;i<a.length;i++) {
    String cls=a[i];
    ESheet s=(ESheet)Class.forName(cls).getDeclaredConstructor().newInstance();
    String name=s.getSheetName(); XSSFSheet xs=wb.getSheet(name);
    System.out.print("== "+cls.substring(cls.lastIndexOf('.')+1)+" expects '"+s.getSheetName()+"' | sheet '"+name+"' "+(xs==null?"KHONG CO":"co")+" ");
    if (xs==null) { System.out.println(); continue; }
    try { s.load(xs); System.out.print("load OK "+(s.list==null?"null":s.list.size()+" row")+" "); } catch (Throwable t) { System.out.println("load FAIL "+t); continue; }
    try { s.decode(); System.out.print("decode OK "); } catch (Throwable t) { System.out.print("decode FAIL "+t.getClass().getSimpleName()+":"+t.getMessage()+" "); }
    if (s.list!=null && !s.list.isEmpty()) { Object r=s.list.get(0); StringBuilder sb=new StringBuilder();
      for (Class<?> k=r.getClass(); k!=null && k!=Object.class; k=k.getSuperclass()) for (Field f:k.getDeclaredFields()) { if (Modifier.isStatic(f.getModifiers())||f.getName().equals("parent")||f.getName().equals("rawValues")) continue; f.setAccessible(true); Object v=f.get(r); if (v instanceof Object[]) v=java.util.Arrays.toString((Object[])v); sb.append(f.getName()).append('=').append(v).append(' '); }
      System.out.print("| row0: "+sb); }
    System.out.println();
  } } }
