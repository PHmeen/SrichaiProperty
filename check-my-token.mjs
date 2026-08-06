// =========================================================================
//  สคริปต์สำหรับทดสอบแกะดูไส้ในของ JWT Token (Decoded Token Inspector)
// =========================================================================

// 1. อิมพอร์ต (Import) ฟังก์ชัน 'decode' จากไลบรารี next-auth/jwt 
// หน้าที่ของ decode คือ เอา Token เข้ารหัสยุ่งๆ มาเปิดดูไส้ในด้วย Secret Key
import { decode } from 'next-auth/jwt';

// 2. กำหนดรหัสลับ (Secret Key) สำหรับเซิร์ฟเวอร์
// รหัสนี้เอามาจากไฟล์ .env.local เปรียบเสมือน "กุญแจไขแม่กุญแจ" ที่ใช้ไขถอดรหัส Token
const secret = "7b901a5d6c8e312f495e80cd21b4a69e710dfb3a4a2c5b9e01f0c2e3d4a5b6c7";

// 3. ตัวแปรสำหรับเก็บ Token ที่คัดลอกมาจาก Browser Cookie (next-auth.session-token)
// เปรียบเสมือน "กล่องความลับที่ถูกล็อกแม่กุญแจไว้"
const tokenFromBrowser = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..zGW5O2nvlB4wWlBg.Hc4YbGOJcBu8G8P-pjSv4ljoEjKP2uA-KDivGlTiAZc-lv7KDugPV6LtZWseiLg93Dj2NqBIxMTT3RaqGAKsFGfLOUPK8f5JKm6XArqDo8yqbm3AsMlHHqtc1YkYelDPDigm7pEEVbVvBv65PTYYV2-IOfRqXbKTCrCyF9VJAK9i4ywKbvRLR64PnI4RqGO1xv_M4RFcVheOsV6Vv5_qJ-7112IYu3DBila1HAu3CHYaW5-mr63Wn-os2jOl3_DuLBJKfJ8hcb7cCus6rDz9DWBVFx3LYG713CJIKkGyLQgmOUBBBHgref9HdyoWVQK_v2YDmNEZiyPIi1OQNK1N7sixeUyB4JfxPwZJ0t0kpPH-Wnnn-Ru-LuTmmWEZiAmnqjIc37Cx_74sO2AXAmS8UfK-1AFUctdUkXS44uoLTU8z6qGLF1_DgB-ki892iL6-JYDX0_i77S7HNrn9lYbnCFl402w0cxtgls8.gzIqHk-YC_OOB3PqKVCFoA"; 

// 4. ฟังก์ชันหลักสำหรับทำงาน ( async function = ฟังก์ชันที่ทำงานแบบรอผลลัพธ์ )
async function inspectToken() {
  
  // 🔍 ด่านที่ 1: ตรวจสอบว่าผู้ใช้เอา Token มาวางใส่ในตัวแปรแล้วหรือยัง?
  if (tokenFromBrowser === "วาง_COOKIE_TOKEN_ตรงนี้" || !tokenFromBrowser) {
    console.log("\n⚠️  คำแนะนำการใช้งาน:");
    console.log("1. เปิดเว็บ http://localhost:3000 แล้วล็อกอินเข้าสู่ระบบในเบราว์เซอร์ก่อน");
    console.log("2. กด F12 -> แท็บ Application -> Cookies -> เลือก http://localhost:3000");
    console.log("3. ก๊อปปี้ค่า (Value) ยาวๆ ของคุกกี้ชื่อ next-auth.session-token");
    console.log("4. นำมาวางแทนที่คำว่า 'วาง_COOKIE_TOKEN_ตรงนี้' ในไฟล์ check-my-token.mjs แล้วกด Save");
    console.log("5. สั่งรันคำสั่ง node check-my-token.mjs อีกครั้งครับ!\n");
    return; // หยุดทำงานทันทีถ้ายินยังไม่ได้วาง Token
  }

  // 🔑 ด่านที่ 2: เริ่มกระบวนการถอดรหัส (Try-Catch Block)
  try {
    // ⚡ จุดสำคัญที่สุด: เรียกใช้ฟังก์ชัน decode()
    // โดยส่ง 2 สิ่งไปให้มันคือ: 1. ตัว Token ดิบ  2. กุญแจลับ (secret)
    // ฟังก์ชันจะคืนค่าข้อมูลข้างในออกมาเก็บไว้ในตัวแปรชื่อ decoded
    const decoded = await decode({ token: tokenFromBrowser, secret });

    // 🖨️ แสดงผลลัพธ์ไส้ในของ Token ออกมาบนหน้าจอ Terminal
    console.log("\n==========================================");
    console.log("🔓 ข้อมูลภายใน JWT Token ของคุณ (Decoded Payload):");
    console.log("==========================================");
    
    // console.dir ใช้พิมพ์ Object ออกมาให้เห็นโครงสร้างแบบสวยงาม
    console.dir(decoded, { depth: null });
    
    // ⏰ ด่านที่ 3: คำนวณวันหมดอายุของ Token (ถ้ามีฟิลด์ exp)
    if (decoded && decoded.exp) {
      // decoded.exp คือเวลาแบบ Unix Timestamp (วินาที) จึงต้องคูณ 1000 เพื่อแปลงเป็นมิลลิวินาที
      const expDate = new Date(Number(decoded.exp) * 1000);
      
      // แปลงวันที่ให้อ่านง่ายสไตล์ไทย เช่น 6/8/2569 22:44:55
      console.log("\n⏰ Token นี้จะหมดอายุวันที่:", expDate.toLocaleString('th-TH'));
    }
    console.log("==========================================\n");

  } catch (error) {
    // ❌ ถ้ารหัส Secret ไม่ตรง หรือ Token โดนแก้ไขแอบแฮก จะเด้งมาทำงานใน catch ทันที
    console.error("\n❌ Token ไม่ถูกต้อง, โดนดัดแปลง หรือรหัส SECRET ไม่ตรงกัน! (Error: " + error.message + ")\n");
  }
}

// 5. สั่งให้ฟังก์ชันเริ่มทำงานทันทีที่รันไฟล์
inspectToken();
