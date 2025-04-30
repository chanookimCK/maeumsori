const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('suggestions.db');

// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// 데이터베이스 테이블 생성
db.run(`CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opinion TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 비밀번호 설정
const ADMIN_PASSWORD = 'admin1234'; // 관리자 비밀번호

// 관리자 인증 미들웨어
function requireAdminAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.redirect('/admin/login');
    }
}

// 관리자 로그인 페이지
app.get('/admin/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>마음의 소리함 - 관리자 로그인</title>
            <style>
                body { 
                    font-family: 'Arial', sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                    background-color: #f0f2f5;
                }
                .login-container { 
                    background: white; 
                    padding: 30px; 
                    border-radius: 10px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    text-align: center;
                }
                h1 {
                    color: #1a73e8;
                    margin-bottom: 20px;
                }
                input { 
                    padding: 12px; 
                    margin: 10px 0; 
                    width: 250px; 
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    font-size: 16px;
                }
                button { 
                    padding: 12px 24px; 
                    background-color: #1a73e8; 
                    color: white; 
                    border: none; 
                    border-radius: 5px; 
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 10px;
                }
                button:hover { 
                    background-color: #1557b0; 
                }
                .back-link {
                    color: #1a73e8;
                    text-decoration: none;
                    margin-top: 20px;
                    display: inline-block;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h1>관리자 로그인</h1>
                <form method="POST" action="/admin/login">
                    <input type="password" name="password" placeholder="관리자 비밀번호를 입력하세요" required />
                    <br>
                    <button type="submit">로그인</button>
                </form>
                <a href="/" class="back-link">메인 페이지로 돌아가기</a>
            </div>
        </body>
        </html>
    `);
});

// 관리자 로그인 처리
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.send(`
            <div style="text-align: center; margin-top: 20px;">
                <p style="color: red;">관리자 비밀번호가 틀렸습니다.</p>
                <a href="/admin/login" style="color: #1a73e8; text-decoration: none;">다시 시도하기</a>
            </div>
        `);
    }
});

// 메인 페이지 (의견 작성 폼)
app.get('/', (req, res) => {
    if (!req.session.sessionId) {
        req.session.sessionId = req.sessionID;
    }
    
    db.all('SELECT * FROM suggestions WHERE session_id = ? ORDER BY created_at DESC', [req.session.sessionId], (err, mySuggestions) => {
        if (err) {
            console.error('DB Error:', err);
            res.status(500).send('오류가 발생했습니다.');
            return;
        }
        if (!Array.isArray(mySuggestions)) {
            mySuggestions = [];
        }
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>마음의 소리함</title>
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 20px; 
                        background-color: #f0f2f5;
                    }
                    .container { 
                        background: white; 
                        padding: 30px; 
                        border-radius: 10px; 
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #1a73e8;
                        margin: 0;
                    }
                    textarea { 
                        width: 100%; 
                        height: 150px; 
                        margin: 10px 0; 
                        padding: 12px; 
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        font-size: 16px;
                        resize: vertical;
                    }
                    button { 
                        padding: 12px 24px; 
                        background-color: #1a73e8; 
                        color: white; 
                        border: none; 
                        border-radius: 5px; 
                        cursor: pointer;
                        font-size: 16px;
                    }
                    button:hover { 
                        background-color: #1557b0; 
                    }
                    .admin-link {
                        color: #1a73e8;
                        text-decoration: none;
                        margin-left: 20px;
                    }
                    .admin-link:hover {
                        text-decoration: underline;
                    }
                    .my-suggestions {
                        margin-top: 30px;
                    }
                    .suggestion {
                        border-bottom: 1px solid #eee;
                        padding: 15px 0;
                    }
                    .date {
                        color: #666;
                        font-size: 0.9em;
                        margin-top: 5px;
                    }
                    .delete-btn {
                        background-color: #dc3545;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        margin-top: 5px;
                    }
                    .delete-btn:hover {
                        background-color: #c82333;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>마음의 소리함</h1>
                        <a href="/admin" class="admin-link">관리자 페이지</a>
                    </div>
                    <form method="POST" action="/submit">
                        <textarea name="opinion" placeholder="마음 속 이야기를 자유롭게 적어주세요" required></textarea>
                        <br>
                        <button type="submit">제출하기</button>
                    </form>
                    
                    <div class="my-suggestions">
                        <h2>내가 제출한 의견</h2>
                        ${mySuggestions.map(suggestion => `
                            <div class="suggestion">
                                <p>${suggestion.opinion}</p>
                                <div class="date">${new Date(suggestion.created_at).toLocaleString()}</div>
                                <button class="delete-btn" onclick="deleteSuggestion(${suggestion.id})">삭제</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <script>
                    function deleteSuggestion(id) {
                        if (confirm('정말로 이 의견을 삭제하시겠습니까?')) {
                            fetch('/delete/' + id, { method: 'POST' })
                                .then(response => {
                                    if (response.ok) {
                                        location.reload();
                                    } else {
                                        alert('삭제 중 오류가 발생했습니다.');
                                    }
                                });
                        }
                    }
                </script>
            </body>
            </html>
        `);
    });
});

// 의견 제출 처리
app.post('/submit', (req, res) => {
    const opinion = req.body.opinion;
    if (!req.session.sessionId) {
        req.session.sessionId = req.sessionID;
    }
    db.run('INSERT INTO suggestions (opinion, session_id) VALUES (?, ?)', [opinion, req.session.sessionId], (err) => {
        if (err) {
            res.status(500).send('오류가 발생했습니다.');
            return;
        }
        res.redirect('/?success=true');
    });
});

// 의견 삭제 처리
app.post('/delete/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM suggestions WHERE id = ? AND session_id = ?', [id, req.session.sessionId], (err) => {
        if (err) {
            res.status(500).send('오류가 발생했습니다.');
            return;
        }
        res.sendStatus(200);
    });
});

// 관리자 페이지
app.get('/admin', requireAdminAuth, (req, res) => {
    db.all('SELECT * FROM suggestions ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).send('오류가 발생했습니다.');
            return;
        }
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>관리자 페이지 - 마음의 소리함</title>
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        max-width: 800px; 
                        margin: 0 auto; 
                        padding: 20px; 
                        background-color: #f0f2f5;
                    }
                    .container { 
                        background: white; 
                        padding: 30px; 
                        border-radius: 10px; 
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #1a73e8;
                        margin: 0;
                    }
                    .suggestion { 
                        border-bottom: 1px solid #eee; 
                        padding: 15px 0; 
                    }
                    .date { 
                        color: #666; 
                        font-size: 0.9em; 
                        margin-top: 5px;
                    }
                    .back { 
                        background-color: #6c757d; 
                        color: white; 
                        text-decoration: none; 
                        padding: 8px 16px; 
                        border-radius: 5px; 
                    }
                    .back:hover { 
                        background-color: #5a6268; 
                    }
                    .logout { 
                        background-color: #dc3545; 
                        color: white; 
                        text-decoration: none; 
                        padding: 8px 16px; 
                        border-radius: 5px;
                        margin-left: 10px;
                    }
                    .logout:hover { 
                        background-color: #c82333; 
                    }
                    .delete-btn {
                        background-color: #dc3545;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        margin-top: 5px;
                    }
                    .delete-btn:hover {
                        background-color: #c82333;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>제출된 의견 목록</h1>
                        <div>
                            <a href="/" class="back">돌아가기</a>
                            <a href="/admin/logout" class="logout">로그아웃</a>
                        </div>
                    </div>
                    ${rows.map(row => `
                        <div class="suggestion">
                            <p>${row.opinion}</p>
                            <div class="date">${new Date(row.created_at).toLocaleString()}</div>
                            <button class="delete-btn" onclick="deleteSuggestion(${row.id})">삭제</button>
                        </div>
                    `).join('')}
                </div>
                <script>
                    function deleteSuggestion(id) {
                        if (confirm('정말로 이 의견을 삭제하시겠습니까?')) {
                            fetch('/admin/delete/' + id, { method: 'POST' })
                                .then(response => {
                                    if (response.ok) {
                                        location.reload();
                                    } else {
                                        alert('삭제 중 오류가 발생했습니다.');
                                    }
                                });
                        }
                    }
                </script>
            </body>
            </html>
        `);
    });
});

// 관리자 로그아웃
app.get('/admin/logout', (req, res) => {
    req.session.isAdmin = false;
    res.redirect('/');
});

// 관리자 의견 삭제 처리
app.post('/admin/delete/:id', requireAdminAuth, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM suggestions WHERE id = ?', [id], (err) => {
        if (err) {
            res.status(500).send('오류가 발생했습니다.');
            return;
        }
        res.sendStatus(200);
    });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
}); 