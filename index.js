const fs = require("fs"); // Import the file system module
const mysql = require("mysql2/promise"); // Import the MySQL promise-based library

// Database connection configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'rfid'
};

// Function to connect to the database
const connectToDB = async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log("Connected to the database.");
        return connection;
    } catch (error) {
        console.error("Error connecting to the database:", error);
        throw error;
    }
};

// Function to create tables if they don't exist and insert demo data
const setupDatabase = async (connection) => {
    try {
        // Create `tbl_user` if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_user (
                id INT AUTO_INCREMENT PRIMARY KEY,
                SSN VARCHAR(20) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                Badgenumber VARCHAR(50),
                CardNo VARCHAR(50),
                privilige VARCHAR(50)
            );
        `);

        // Create `tbl_checkinout` if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tbl_checkinout (
                id INT AUTO_INCREMENT PRIMARY KEY,
                SSN VARCHAR(20) NOT NULL,
                CHECKTIME DATETIME NOT NULL,
                UNIQUE(SSN, CHECKTIME),  -- To prevent duplicate entries
                FOREIGN KEY (SSN) REFERENCES tbl_user(SSN) ON DELETE CASCADE
            );
        `);

        // Insert demo users into `tbl_user` if the table is empty
        const [users] = await connection.query("SELECT COUNT(*) as count FROM tbl_user");
        if (users[0].count === 0) {
            await connection.query(`
                INSERT INTO tbl_user (SSN, name, Badgenumber, CardNo, privilige) VALUES
                ('123-45-6789', 'John Doe', 'BN123', 'CN001', 'Admin'),
                ('987-65-4321', 'Jane Smith', 'BN456', 'CN002', 'User');
            `);
            console.log("Inserted demo users into tbl_user.");
        }

        // Insert demo logs into `tbl_checkinout` if the table is empty
        const [logs] = await connection.query("SELECT COUNT(*) as count FROM tbl_checkinout");
        if (logs[0].count === 0) {
            await connection.query(`
                INSERT INTO tbl_checkinout (SSN, CHECKTIME) VALUES
                ('123-45-6789', '2024-10-01 08:00:00'),
                ('987-65-4321', '2024-10-01 09:00:00');
            `);
            console.log("Inserted demo logs into tbl_checkinout.");
        }

    } catch (error) {
        console.error("Error setting up database or inserting demo data:", error);
    }
};

// Function to fetch data from `tbl_user` and `tbl_checkinout`
const fetchData = async (connection) => {
    try {
        // Fetch all users from `tbl_user`
        const [users] = await connection.query("SELECT * FROM tbl_user");
        console.log("Users:", users);

        // Fetch all check-ins/outs from `tbl_checkinout`
        const [checkinouts] = await connection.query("SELECT * FROM tbl_checkinout");
        console.log("Checkin/Checkout Logs:", checkinouts);

    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

// Function to check for duplicate logs before inserting
const isDuplicateLog = async (connection, SSN, CHECKTIME) => {
    try {
        const query = "SELECT COUNT(*) as count FROM tbl_checkinout WHERE SSN = ? AND CHECKTIME = ?";
        const [result] = await connection.execute(query, [SSN, CHECKTIME]);
        return result[0].count > 0;  // Return true if there's a duplicate
    } catch (error) {
        console.error("Error checking for duplicate log:", error);
        throw error;
    }
};

// Function to insert attendance log into the database
const insertAttendanceLog = async (connection, SSN, CHECKTIME) => {
    try {
        // Check for duplicate before inserting
        const duplicate = await isDuplicateLog(connection, SSN, CHECKTIME);
        if (duplicate) {
            console.log(`Duplicate log found for SSN: ${SSN} at ${CHECKTIME}. Skipping insert.`);
            return;
        }

        // Insert the log if no duplicate is found
        const query = "INSERT INTO tbl_checkinout (SSN, CHECKTIME) VALUES (?, ?)";
        await connection.execute(query, [SSN, CHECKTIME]);
        console.log(`Inserted log for SSN: ${SSN} at ${CHECKTIME}`);
    } catch (error) {
        console.error("Error inserting log into the database:", error);
    }
};

// New Function to Fetch Logs from File, Get SSN from DB and Save into tbl_checkinout
const fetchLogsFromFile = async (connection) => {
    fs.readFile('last_10_attendance_logs.txt', 'utf8', async (err, data) => {
        if (err) {
            console.error("Error reading the file:", err);
            return;
        }

        try {
            // Parse the file content to JSON format
            const attendanceLogs = JSON.parse(data);
            console.log("Attendance Logs from File:", attendanceLogs);

            // Process each log entry
            for (const log of attendanceLogs) {
                const { user_id, record_time } = log;

                // Validate the log's structure
                if (!user_id || !record_time) {
                    console.warn(`Invalid log entry: ${JSON.stringify(log)}. Skipping.`);
                    continue;
                }

                // Query the database to get the corresponding SSN for the user_id
                const [user] = await connection.query("SELECT SSN FROM tbl_user WHERE id = ?", [user_id]);

                if (user.length > 0) {
                    const SSN = user[0].SSN;

                    // Insert the SSN and record_time into tbl_checkinout as CHECKTIME
                    await insertAttendanceLog(connection, SSN, new Date(record_time).toISOString());
                } else {
                    console.log(`No user found with ID: ${user_id}`);
                }
            }
        } catch (parseErr) {
            console.error("Error parsing the log file:", parseErr);
        }
    });
};

// Main function to manage the process
const manageAttendanceLogs = async () => {
    try {
        const connection = await connectToDB();
        await setupDatabase(connection); // Ensure the tables are set up and insert demo data

        // Fetch and process logs from the file
        await fetchLogsFromFile(connection);

    } catch (error) {
        console.error("Error:", error);
    }
};

manageAttendanceLogs();
