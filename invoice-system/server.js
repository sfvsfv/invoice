const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const DB_FILE = "./db.json";
const PROJECT_FILE = "./projects.json";

// 初始化 DB 文件
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
if (!fs.existsSync(PROJECT_FILE)) fs.writeFileSync(PROJECT_FILE, JSON.stringify([
    "信息系统服务",
    "技术服务费",
    "信息系统服务 + 技术服务费"
]));

// 后台密码
const ADMIN_PASSWORD = "chuanchuan";

// 已登录 token 列表
let VALID_TOKENS = [];

/* ============================
   登录接口（返回 token）
============================ */
app.post("/api/login", (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
        const token = crypto.randomBytes(16).toString("hex");
        VALID_TOKENS.push(token);
        return res.json({ success: true, token });
    }

    res.json({ success: false, message: "密码错误" });
});

/* ============================
   Token 校验
============================ */
app.post("/api/check-token", (req, res) => {
    const { token } = req.body;
    if (VALID_TOKENS.includes(token)) {
        return res.json({ valid: true });
    }
    res.json({ valid: false });
});

/* ============================
   发票记录 API
============================ */
app.get("/api/list", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(data);
});

app.post("/api/submit", (req, res) => {
    const body = req.body;

    const record = {
        id: Date.now(),
        invoiceType: body.invoiceType,
        companyName: body.companyName,
        creditCode: body.creditCode,
        invoiceItem: body.invoiceItem,
        invoiceEmail: body.invoiceEmail,
        payEmail: body.payEmail,
        amount: body.amount,
        remark: body.remark,
        createdAt: new Date().toISOString()
    };

    const data = JSON.parse(fs.readFileSync(DB_FILE));
    data.push(record);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    res.json({ message: "提交成功", record });
});

// 更新发票记录
app.post("/api/update-record", (req, res) => {
    const token = req.headers.authorization;
    if (!VALID_TOKENS.includes(token)) {
        return res.status(403).json({ error: "No permission" });
    }

    const updated = req.body; // 包含 id

    let list = JSON.parse(fs.readFileSync(DB_FILE));
    list = list.map(item => item.id === updated.id ? updated : item);

    fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2));
    res.json({ success: true });
});


// 删除发票记录
app.post("/api/delete-record", (req, res) => {
    const token = req.headers.authorization;
    if (!VALID_TOKENS.includes(token)) {
        return res.status(403).json({ error: "No permission" });
    }

    const { id } = req.body;
    let list = JSON.parse(fs.readFileSync(DB_FILE));
    list = list.filter(item => item.id !== id);

    fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2));
    res.json({ success: true });
});



/* ============================
   开票项目 API
============================ */
app.get("/api/projects", (req, res) => {
    const items = JSON.parse(fs.readFileSync(PROJECT_FILE));
    res.json(items);
});

app.post("/api/projects/add", (req, res) => {
    const { name } = req.body;

    let items = JSON.parse(fs.readFileSync(PROJECT_FILE));
    if (!items.includes(name)) {
        items.push(name);
        fs.writeFileSync(PROJECT_FILE, JSON.stringify(items, null, 2));
    }

    res.json({ success: true, items });
});

app.post("/api/projects/delete", (req, res) => {
    const { name } = req.body;

    let items = JSON.parse(fs.readFileSync(PROJECT_FILE));
    items = items.filter(i => i !== name);
    fs.writeFileSync(PROJECT_FILE, JSON.stringify(items, null, 2));

    res.json({ success: true, items });
});

/* ============================
   启动服务
============================ */
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
