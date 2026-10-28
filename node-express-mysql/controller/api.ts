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

// จำลองการสร้างออเดอร์แบบสุ่ม (simulate orders)
router.post('/orders/simulate', async (req: Request, res: Response) => {
    try {
        // 1. ดึงข้อมูล customer_id ทั้งหมดที่มีในระบบ
        const [customers] = await conn.query('SELECT customer_id FROM customers') as [any[], any];

        if (!customers || customers.length === 0) {
            return res.status(400).json({ error: 'ไม่พบข้อมูลลูกค้าในระบบ กรุณาเพิ่มข้อมูลลูกค้าก่อนจำลองออเดอร์' });
        }

        // 2. สุ่มจำนวนออเดอร์ระหว่าง 20 ถึง 30 รายการ
        const orderCount = Math.floor(Math.random() * (30 - 20 + 1)) + 20;

        const newOrders = [];

        // 3. สุ่มสร้างข้อมูลออเดอร์
        for (let i = 0; i < orderCount; i++) {
            // สุ่มเลือกลูกค้า 1 คนจากรายการทั้งหมด
            const randomCustomer = customers[Math.floor(Math.random() * customers.length)];

            // สุ่มจำนวนกล่อง 1 ถึง 3 กล่อง
            const boxCount = Math.floor(Math.random() * 3) + 1;

            newOrders.push([randomCustomer.customer_id, boxCount, 'pending']);
        }

        // 4. บันทึกข้อมูลลงในตาราง orders แบบ Bulk Insert
        const sql = 'INSERT INTO orders (customer_id, box_count, status) VALUES ?';
        const [result] = await conn.query(sql, [newOrders]) as [any, any];

        return res.json({
            message: `จำลองออเดอร์สำเร็จจำนวน ${orderCount} รายการ`,
            count: orderCount,
            inserted_rows: result.affectedRows
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

        const sql = "INSERT INTO orders (customer_id, box_count, status) VALUES (?, ?, 'pending')";
        const [result] = await conn.query(sql, [customer_id, box_count]) as [any, any];

        return res.status(201).json({
            message: "เพิ่มออเดอร์สำเร็จ",
            order_id: result.insertId,
            customer_id,
            box_count,
            status: 'pending'
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

// ดึงรายการจุดส่งของไรเดอร์ตาม rider_id สำหรับวันนี้
router.get('/api/riders/:riderId/tasks', async (req, res) => {
    try {
        const { riderId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                rs.stop_id,
                rs.stop_seq,
                rs.status AS stop_status,
                o.order_id,
                o.box_count,
                o.deadline,
                c.first_name,
                c.last_name,
                c.phone,
                c.lat,
                c.lng,
                c.address_note
            FROM route_plans rp
            JOIN routes r ON rp.plan_id = r.plan_id
            JOIN route_stops rs ON r.route_id = rs.route_id
            JOIN orders o ON rs.order_id = o.order_id
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE r.rider_id = ? AND rp.plan_date = ?
            ORDER BY rs.stop_seq ASC;
        `;
        const [rows] = await conn.query(query, [riderId, today]);
        res.json(rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// เพิ่มข้อมูลไรเดอร์ใหม่ (POST /riders)
router.post('/riders', async (req: Request, res: Response) => {
    try {
        const { name, phone, username, capacity, is_active } = req.body;

        // 🔴 ดึงค่ารหัสผ่าน (รองรับทั้งชื่อ password และ password_hash)
        const rawPassword = req.body.password || req.body.password_hash;

        // ตรวจสอบว่ามีรหัสผ่านส่งมาหรือไม่
        if (!name || !username || !rawPassword) {
            return res.status(400).json({ error: "กรุณากรอก name, username และ password ให้ครบถ้วน" });
        }

        // หากมีการใช้ bcrypt เข้ารหัสรหัสผ่าน
        // const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const hashedPassword = rawPassword; // หรือใช้ค่าตรงถ้ายังไม่ใช้ bcrypt

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