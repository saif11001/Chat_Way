const http = require('http');
const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/DB');
require('dotenv').config()
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cors = require("cors");
const csrf = require("csurf");

const PORT = process.env.PORT;
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());
app.use(cors());
app.use(csrf());

require('./socket/chat')(server);

const authRoute = require('./routes/auth');
const homeRoute = require('./routes/home');
const adminRoute = require('./routes/admin');
app.use('/auth', authRoute);
app.use('/admin', adminRoute);
app.use('/', homeRoute);

app.use((error, req, res, next) => {
    console.error(error, "Unhandled error occurred");
    const statusCode = error.statusCode || 500;
    const status = statusCode.toString().startsWith("4") ? "fail" : "error";
    res.status(statusCode).json({
        status: status,
        message: error.message || "Internal Server Error"
    });
});

(async () => {
    try{
        await sequelize.authenticate();
        console.log("Database connected successfully!");

        await sequelize.sync();
            server.listen(PORT, () => {
                console.log(`Server running at http://localhost:${PORT}`
            );  
        });
    } catch (error) {
        console.log('Database connection failed: ', error);
        process.exit(1);
    }
})();


