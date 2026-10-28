import express from "express";
import { conn } from "../dbconnect";
import { Customers } from "../model/customers";
import { Orders } from "../model/orders";
import { Riders } from "../model/riders";
import { RoutePlans } from "../model/route_plans";
import { Route } from "../model/route";
import { RouteStops } from "../model/route_stops";
import { Request, Response, Router } from 'express';
import { randomBytes, scrypt } from 'crypto';
import bcrypt from 'bcrypt';

export const router = express.Router();

//------------------------------ GET ------------------------------------

router.get('/', (req, res) => {
    res.send('Get in index.ts');
});

// ดูข้อมูลลูกค้าทั้งหมด
router.get('/customers', async (req, res) => {
    const [rows] = await conn.query("SELECT * FROM customers");
    let customers: Customers[] = rows as Customers[];
    res.json(customers);
});

// ค้นหาลูกค้าตามชื่อหรือสกุล
router.get('/customers/search', async (req, res) => {
    try {
        const keyword = req.query.q || ''; // รับคำค้นหาจาก Query Parameter เช่น ?q=สมชาย
        const searchQuery = `%${keyword}%`;

        const [rows] = await conn.query(
            "SELECT * FROM customers WHERE first_name LIKE ? OR last_name LIKE ?",
            [searchQuery, searchQuery]
        );
        let customers: Customers[] = rows as Customers[];
        res.json(customers);
    } catch (err) {
        // TypeScript standard error handling (ไม่ต้องใช้ any)
        if (err instanceof Error) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

// ดูข้อมูลลูกค้าตามรหัสลูกค้า
router.get('/customers/:id', async (req, res) => {
    const customerId = req.params.id;
    const [rows] = await conn.query("SELECT * FROM customers WHERE customer_id = ?", [customerId]);
    let customers: Customers[] = rows as Customers[];
    res.json(customers);
});

// ดูข้อมูลออเดอร์ในรัศมี 2 กม. รอบ มมส
router.get('/orders/nearby-msu', async (req: Request, res: Response) => {
    try {
        const msuLat = 16.1944;
        const msuLng = 103.2536;
        const radiusKm = 2; // รัศมี 2 กิโลเมตร

        const sql = `
            SELECT * FROM (
                SELECT 
                    o.order_id, 
                    o.box_count, 
                    o.status, 
                    c.customer_id, 
                    c.first_name, 
                    c.last_name, 
                    c.phone, 
                    c.lat, 
                    c.lng, 
                    c.address_note,
                    (
                        6371 * acos(
                            cos(radians(?)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians(?)) +
                            sin(radians(?)) * sin(radians(c.lat))
                        )
                    ) AS distance_km
                FROM orders o
                JOIN customers c ON o.customer_id = c.customer_id
            ) AS temp_table
            WHERE distance_km <= ?
            ORDER BY distance_km ASC
        `;

        const [rows] = await conn.query(sql, [msuLat, msuLng, msuLat, radiusKm]);
        res.status(200).json(rows);

    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ดูข้อมูลคำสั่งซื้อทั้งหมด
router.get('/orders', async (req, res) => {
    const [rows] = await conn.query("SELECT * FROM orders");
    let orders: Orders[] = rows as Orders[];
    res.json(orders);
});

// ดูข้อมูลคำสั่งซื้อตาม id
router.get('/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    const [rows] = await conn.query("SELECT * FROM orders WHERE order_id = ?", [orderId]);
    let orders: Orders[] = rows as Orders[];
    res.json(orders);
});

// ดูข้อมูลไรเดอร์ทั้งหมด
router.get('/riders', async (req, res) => {
    const [rows] = await conn.query("SELECT * FROM riders");
    let riders: Riders[] = rows as Riders[];
    res.json(riders);
});

// ดูข้อมูลแผนการเดินทางทั้งหมด
router.get('/route_plans', async (req, res) => {
    const [rows] = await conn.query("SELECT * FROM route_plans");
    let routePlans: RoutePlans[] = rows as RoutePlans[];
    res.json(routePlans);
});

// ดูข้อมูลเส้นทางทั้งหมด
router.get('/routes', async (req, res) => {
    const [rows] = await conn.query("SELECT * FROM routes");
    let routes: Route[] = rows as Route[];
    res.json(routes);
});

// ดูข้อมูลจุดหยุดทั้งหมด
router.get('/route_stops', async (req, res) => {
    const [rows] = await conn.query("SELECT * FROM route_stops");
    let routeStops: RouteStops[] = rows as RouteStops[];
    res.json(routeStops);
});


//------------------------------ DELETE ------------------------------------

// 1. DELETE ลูกค้า (customers)
router.delete('/customers/:id', async (req: Request, res: Response) => {
    try {
        let id = req.params.id;
        const [result] = await conn.query("DELETE FROM customers WHERE customer_id = ?", [id]);

        const deleteResult = result as any;
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }

        res.status(200).json({ affected_row: deleteResult.affectedRows });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// 2. DELETE ออเดอร์ (orders)
router.delete("/orders/:id", async (req, res) => {
    try {
        let id = req.params.id;
        const [result] = await conn.query("DELETE FROM orders WHERE order_id = ?", [id]);

        const deleteResult = result as any;
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.status(200).json({ affected_row: deleteResult.affectedRows });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// 3. DELETE ไรเดอร์ (riders)
router.delete("/riders/:id", async (req, res) => {
    try {
        let id = req.params.id;
        const [result] = await conn.query("DELETE FROM riders WHERE rider_id = ?", [id]);

        const deleteResult = result as any;
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: "Rider not found" });
        }

        res.status(200).json({ affected_row: deleteResult.affectedRows });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// 4. DELETE แผนการเดินทาง (route_plans)
router.delete("/route_plans/:id", async (req, res) => {
    try {
        let id = req.params.id;
        const [result] = await conn.query("DELETE FROM route_plans WHERE plan_id = ?", [id]);

        const deleteResult = result as any;
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: "Route plan not found" });
        }

        res.status(200).json({ affected_row: deleteResult.affectedRows });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// 5. DELETE เส้นทาง (routes)
router.delete("/routes/:id", async (req, res) => {
    try {
        let id = req.params.id;
        const [result] = await conn.query("DELETE FROM routes WHERE route_id = ?", [id]);

        const deleteResult = result as any;
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: "Route not found" });
        }

        res.status(200).json({ affected_row: deleteResult.affectedRows });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// 6. DELETE ออเดอร์ทั้งหมด
router.delete('/orders', async (req: Request, res: Response) => {
    try {
        // ลบข้อมูลทั้งหมดจากตาราง orders
        const [result] = await conn.query('DELETE FROM orders') as [any, any];

        return res.json({
            message: 'ล้างออเดอร์ทั้งหมดเรียบร้อยแล้ว',
            deleted_count: result.affectedRows
        });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'เกิดข้อผิดพลาดในการล้างออเดอร์' });
    }
});

//------------------------------ POST ------------------------------------

// เพิ่มลูกค้าใหม่ (POST /customers)
router.post('/customers', async (req: Request, res: Response) => {
    try {
        const { first_name, last_name, phone, lat, lng, address_note } = req.body;

        const sql = `
            INSERT INTO customers (first_name, last_name, phone, lat, lng, address_note) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await conn.query(sql, [first_name, last_name, phone, lat, lng, address_note]);

        return res.status(201).json({ message: "เพิ่มข้อมูลลูกค้าสำเร็จ", id: (result as any).insertId });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'เกิดข้อผิดพลาดในการเพิ่มลูกค้า' });
    }
});

// จำลองการสร้างออเดอร์แบบสุ่ม
router.post('/orders/simulate', async (req: Request, res: Response) => {
    try {
        // 1. ดึงข้อมูล customer_id ทั้งหมดที่มีในระบบ
        const [customers] = await conn.query('SELECT customer_id FROM customers') as [any[], any];

        if (!customers || customers.length === 0) {
            return res.status(400).json({ error: 'ไม่พบข้อมูลลูกค้าในระบบ กรุณาเพิ่มข้อมูลลูกค้ารายการก่อนจำลองออเดอร์' });
        }

        // 🟢 2. เช็กว่า Frontend ส่ง count มาไหม (เช่น ส่ง { count: 1 } มา) ถ้าไม่ส่งมาให้สุ่ม 20 ถึง 30 รายการ
        const reqCount = Number(req.body?.count);
        const orderCount = reqCount > 0
            ? reqCount
            : Math.floor(Math.random() * (30 - 20 + 1)) + 20;

        // 🟢 3. คำนวณ DEADLINE เวลาไทย (Asia/Bangkok) + 1 ชั่วโมง แสดงเป็น HH:mm
        const deadlineDate = new Date(Date.now() + 60 * 60 * 1000);
        const deadline = deadlineDate.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Bangkok',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const newOrders = [];

        // 4. สุ่มสร้างข้อมูลออเดอร์
        for (let i = 0; i < orderCount; i++) {
            const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
            const boxCount = Math.floor(Math.random() * 3) + 1;

            // 🟢 เพิ่มค่า deadline เข้าไปในชุดข้อมูล
            newOrders.push([randomCustomer.customer_id, boxCount, 'pending', deadline]);
        }

        // 🟢 5. เพิ่มคอลัมน์ deadline ในคำสั่ง SQL
        const sql = 'INSERT INTO orders (customer_id, box_count, status, deadline) VALUES ?';
        const [result] = await conn.query(sql, [newOrders]) as [any, any];

        return res.json({
            message: `จำลองออเดอร์สำเร็จจำนวน ${orderCount} รายการ`,
            count: orderCount,
            inserted_rows: result.affectedRows,
            deadline
        });

    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'เกิดข้อผิดพลาดในการจำลองออเดอร์' });
    }
});

// เพิ่มออเดอร์ใหม่
router.post('/orders', async (req: Request, res: Response) => {
    try {
        const { customer_id, box_count } = req.body;

        if (!customer_id || !box_count) {
            return res.status(400).json({ error: "กรุณาระบุ customer_id และ box_count ให้ครบถ้วน" });
        }

        // 🟢 1. คำนวณ DEADLINE (+1 ชม.) และบังคับใช้เวลาไทย (Asia/Bangkok) แสดงแค่ HH:mm
        const deadlineDate = new Date(Date.now() + 60 * 60 * 1000); // บวก 1 ชั่วโมง

        const deadline = deadlineDate.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Bangkok',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }); // ผลลัพธ์จะได้เป็น "05:06" พอดี

        // 🟢 2. บันทึกค่า deadline ลง SQL
        const sql = "INSERT INTO orders (customer_id, box_count, status, deadline) VALUES (?, ?, 'pending', ?)";
        const [result] = await conn.query(sql, [customer_id, box_count, deadline]) as [any, any];

        return res.status(201).json({
            message: "เพิ่มออเดอร์สำเร็จ",
            order_id: result.insertId,
            customer_id,
            box_count,
            status: 'pending',
            deadline
        });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'เกิดข้อผิดพลาดในการเพิ่มออเดอร์' });
    }
});

// แก้ไขจำนวนกล่องในออเดอร์ตาม order_id
router.put('/orders/:id', async (req: Request, res: Response) => {
    try {
        const orderId = req.params.id;
        const { box_count } = req.body;

        if (box_count === undefined || box_count <= 0) {
            return res.status(400).json({ error: "กรุณาระบุจำนวนกล่องที่ถูกต้อง (มากกว่า 0)" });
        }

        const sql = "UPDATE orders SET box_count = ? WHERE order_id = ?";
        const [result] = await conn.query(sql, [box_count, orderId]) as [any, any];

        const updateResult = result as any;
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบออเดอร์ที่ต้องการแก้ไข" });
        }

        return res.status(200).json({
            message: "อัปเดตจำนวนกล่องสำเร็จ",
            order_id: orderId,
            new_box_count: box_count
        });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'เกิดข้อผิดพลาดในการแก้ไขออเดอร์' });
    }
});

// แก้ไขข้อมูลลูกค้า
router.put('/customers/:id', async (req: Request, res: Response) => {
    try {
        const customerId = req.params.id;
        const { first_name, last_name, phone, lat, lng, address_note } = req.body;

        const sql = `
            UPDATE customers 
            SET first_name = ?, last_name = ?, phone = ?, lat = ?, lng = ?, address_note = ? 
            WHERE customer_id = ?
        `;
        const [result] = await conn.query(sql, [first_name, last_name, phone, lat, lng, address_note, customerId]) as [any, any];

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลลูกค้าที่ต้องการแก้ไข" });
        }

        return res.status(200).json({ message: "อัปเดตข้อมูลลูกค้าสำเร็จ" });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'เกิดข้อผิดพลาดในการแก้ไขลูกค้า' });
    }
});

// ตัวอย่าง Endpoint สำหรับดึงรายการงานของไรเดอร์แต่ละคน
router.get('/riders/:id/tasks', async (req: Request, res: Response) => {
    try {
        const riderId = req.params.id;

        // คำสั่ง SQL ที่ถูกต้องตามโครงสร้าง Schema จริง
        const sql = `
            SELECT 
                rs.stop_id,
                rs.stop_seq,
                rs.eta,
                rs.delivered_at,
                r.color,
                o.order_id,
                o.box_count,
                o.deadline,
                o.status,
                c.first_name,
                c.last_name,
                c.phone,
                c.lat,
                c.lng,
                c.address_note
            FROM routes r
            JOIN route_plans rp ON r.plan_id = rp.plan_id
            JOIN route_stops rs ON r.route_id = rs.route_id
            JOIN orders o ON rs.order_id = o.order_id
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE r.rider_id = ?
              AND COALESCE(LOWER(TRIM(o.status)), 'pending') NOT IN ('completed', 'delivered', 'cancelled')
              AND rp.plan_id = (
                  SELECT MAX(latest_rp.plan_id)
                  FROM route_stops latest_rs
                  JOIN routes latest_r ON latest_r.route_id = latest_rs.route_id
                  JOIN route_plans latest_rp ON latest_rp.plan_id = latest_r.plan_id
                  WHERE latest_rs.order_id = o.order_id
              )
            ORDER BY rs.stop_seq ASC
        `;

        const [rows]: any = await conn.query(sql, [riderId]);
        return res.json(rows);

    } catch (err: any) {
        console.error('API Error /riders/:id/tasks:', err);
        return res.status(500).json({ error: err.message || 'Database error' });
    }
});

router.put('/riders/:riderId/tasks/:orderId/delivered', async (req: Request, res: Response) => {
    const riderId = Number(req.params.riderId);
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(riderId) || riderId <= 0 || !Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ error: 'รหัสไรเดอร์หรือออเดอร์ไม่ถูกต้อง' });
    }

    const connection = await conn.getConnection();
    try {
        await connection.beginTransaction();

        const [rows]: any = await connection.query(`
            SELECT rs.stop_id
            FROM route_stops rs
            JOIN routes r ON r.route_id = rs.route_id
            JOIN route_plans rp ON rp.plan_id = r.plan_id
            JOIN orders o ON o.order_id = rs.order_id
            WHERE r.rider_id = ?
              AND o.order_id = ?
              AND COALESCE(LOWER(TRIM(o.status)), 'pending') NOT IN ('completed', 'delivered', 'cancelled')
              AND rp.plan_id = (
                  SELECT MAX(latest_rp.plan_id)
                  FROM route_stops latest_rs
                  JOIN routes latest_r ON latest_r.route_id = latest_rs.route_id
                  JOIN route_plans latest_rp ON latest_rp.plan_id = latest_r.plan_id
                  WHERE latest_rs.order_id = o.order_id
              )
            LIMIT 1
            FOR UPDATE
        `, [riderId, orderId]);

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'ไม่พบงานที่ยังจัดส่งได้ของไรเดอร์คนนี้' });
        }

        await connection.query("UPDATE orders SET status = 'delivered' WHERE order_id = ?", [orderId]);
        await connection.query('UPDATE route_stops SET delivered_at = NOW() WHERE stop_id = ?', [rows[0].stop_id]);
        await connection.commit();

        return res.json({ message: 'บันทึกสถานะจัดส่งสำเร็จ', order_id: orderId, status: 'delivered' });
    } catch (err: any) {
        await connection.rollback();
        console.error('API Error PUT /riders/:riderId/tasks/:orderId/delivered:', err);
        return res.status(500).json({ error: err?.message || 'ไม่สามารถอัปเดตสถานะจัดส่งได้' });
    } finally {
        connection.release();
    }
});

router.post('/route-plans', async (req: Request, res: Response) => {
    const { plan_date, depart_time, assignments } = req.body;
    if (!plan_date || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ error: 'กรุณาระบุวันที่และรายการเส้นทาง' });
    }

    const connection = await conn.getConnection();
    try {
        await connection.beginTransaction();

        const [planResult]: any = await connection.query(
            'INSERT INTO route_plans (plan_date, depart_time, app_created) VALUES (?, ?, 1)',
            [plan_date, depart_time || new Date().toTimeString().slice(0, 8)]
        );
        const planId = planResult.insertId;

        for (const assignment of assignments) {
            const stops = Array.isArray(assignment.stops) ? assignment.stops : [];
            if (!assignment.riderId || stops.length === 0) continue;

            const [routeResult]: any = await connection.query(
                'INSERT INTO routes (plan_id, rider_id, color, map_link) VALUES (?, ?, ?, ?)',
                [planId, assignment.riderId, assignment.color ?? '#0077b6', '']
            );

            for (const [index, stop] of stops.entries()) {
                if (!stop.orderId) continue;
                await connection.query(
                    'INSERT INTO route_stops (route_id, order_id, stop_seq, eta, delivered_at) VALUES (?, ?, ?, ?, NULL)',
                    [routeResult.insertId, stop.orderId, index + 1, null]
                );
            }
        }

        await connection.commit();
        return res.status(201).json({ message: 'บันทึกแผนเส้นทางสำเร็จ', plan_id: planId });
    } catch (err: any) {
        await connection.rollback();
        console.error('API Error POST /route-plans:', err);
        return res.status(500).json({ error: err?.message || 'ไม่สามารถบันทึกแผนเส้นทางได้' });
    } finally {
        connection.release();
    }
});

// เพิ่มข้อมูลไรเดอร์ใหม่พร้อม Hash รหัสผ่าน (POST /riders)
router.post('/riders', async (req: Request, res: Response) => {
    try {
        const { name, phone, username, capacity, is_active } = req.body;


        const rawPassword = req.body.password || req.body.password_hash;

        if (!name || !username || !rawPassword) {
            return res.status(400).json({ error: "กรุณากรอก name, username และ password ให้ครบถ้วน" });
        }


        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

        const riderCapacity = capacity ?? 10;
        const activeStatus = is_active ?? 1;


        const sql = `
      INSERT INTO riders (name, phone, username, password_hash, capacity, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        const [result] = await conn.query(sql, [
            name,
            phone ?? null,
            username,
            hashedPassword,
            riderCapacity,
            activeStatus
        ]) as [any, any];

        return res.status(201).json({
            message: "เพิ่มข้อมูลไรเดอร์สำเร็จ",
            rider_id: result.insertId
        });

    } catch (err: any) {
        if (err?.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username นี้ถูกใช้งานแล้ว" });
        }
        return res.status(500).json({ error: err?.message ?? 'เกิดข้อผิดพลาดในการเพิ่มไรเดอร์' });
    }
});

// ตรวจสอบการเข้าสู่ระบบของไรเดอร์ (POST /api/riders/login)
router.post('/riders/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
        }

        // 🟢 1. ดึง password_hash ออกมาด้วย username และเช็ก is_active = 1
        const sql = `
            SELECT rider_id, name, phone, capacity, is_active, password_hash 
            FROM riders 
            WHERE username = ? AND is_active = 1
        `;

        const [rows]: any = await conn.query(sql, [username.trim()]);

        if (rows.length === 0) {
            return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับการใช้งาน" });
        }

        const rider = rows[0];

        // 🟢 2. เปรียบเทียบรหัสผ่านตัวธรรมดา (password) กับค่า Hash ใน DB (rider.password_hash)
        const isPasswordValid = await bcrypt.compare(password, rider.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับการใช้งาน" });
        }

        // 🟢 3. ถ้ารหัสผ่านถูกต้อง คืนค่าข้อมูลไรเดอร์
        return res.json({
            message: "เข้าสู่ระบบสำเร็จ",
            rider: {
                rider_id: rider.rider_id,
                name: rider.name,
                phone: rider.phone,
                capacity: rider.capacity
            }
        });

    } catch (err: any) {
        console.error('Login Error:', err);
        return res.status(500).json({ error: err?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
});

router.post('/api/routes/save', async (req, res) => {
    try {
        const { plan_date, routes } = req.body;

        // 1. บันทึกแผนลง route_plans (เปลี่ยน pool เป็นชื่อตัวแปรจริงของคุณ เช่น db หรือ conn)
        const [planResult] = await conn.query(
            'INSERT INTO route_plans (plan_date) VALUES (?)',
            [plan_date || new Date()]
        );
        const planId = (planResult as any).insertId;

        // 2. วนลูปบันทึก routes และ route_stops
        for (const r of routes) {
            const [routeResult] = await conn.query(
                'INSERT INTO routes (plan_id, rider_id, color) VALUES (?, ?, ?)',
                [planId, r.rider_id || r.id, r.color || '#0077b6']
            );
            const routeId = (routeResult as any).insertId;

            if (r.orders && Array.isArray(r.orders)) {
                for (let i = 0; i < r.orders.length; i++) {
                    await conn.query(
                        'INSERT INTO route_stops (route_id, order_id, stop_seq) VALUES (?, ?, ?)',
                        [routeId, r.orders[i].order_id, i + 1]
                    );
                }
            }
        }

        res.json({ success: true, message: 'บันทึกเส้นทางสำเร็จ' });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
