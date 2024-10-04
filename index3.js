const fs = require("fs"); // Import the file system module

const manageAttendanceLogs = async () => {
    try {
        // Function to fetch and process attendance logs from the file
        const fetchAttendanceLogsFromFile = async () => {
            try {
                // Read logs from the text file
                fs.readFile('last_10_attendance_logs.txt', 'utf8', (err, data) => {
                    if (err) {
                        console.error("Error reading the file:", err);
                        return;
                    }

                    // Parse the file content to JSON format
                    let attendanceLogs;
                    try {
                        attendanceLogs = JSON.parse(data);
                    } catch (parseErr) {
                        console.error("Error parsing the log file:", parseErr);
                        return;
                    }

                    // Ensure the logs are in an array
                    let logsArray = Array.isArray(attendanceLogs) ? attendanceLogs : [];

                    // Object to group logs by `user_id` and date
                    const groupedLogsByDate = {};

                    // Group logs by `user_id` and date
                    logsArray.forEach(log => {
                        const userId = log.user_id;
                        const logDate = new Date(log.record_time).toDateString(); // Extract the date only

                        // Initialize grouping structure if it doesn't exist
                        if (!groupedLogsByDate[userId]) {
                            groupedLogsByDate[userId] = {};
                        }
                        if (!groupedLogsByDate[userId][logDate]) {
                            groupedLogsByDate[userId][logDate] = {
                                sn: [],
                                user_id: userId,
                                record_time: [],
                                ip: log.ip, // Assuming the IP is consistent for each user
                            };
                        }

                        // Add the `sn` and `record_time` values for the specific user and date
                        groupedLogsByDate[userId][logDate].sn.push(log.sn);
                        groupedLogsByDate[userId][logDate].record_time.push(new Date(log.record_time));
                    });

                    // Array to store the final processed logs
                    const resultArray = [];

                    // Process each user's logs for each date
                    Object.keys(groupedLogsByDate).forEach(userId => {
                        Object.keys(groupedLogsByDate[userId]).forEach(logDate => {
                            const userLogs = groupedLogsByDate[userId][logDate];

                            // Sort the `record_time` to determine `CHECKIN` and `CHECKOUT`
                            userLogs.record_time.sort((a, b) => a - b);

                            // Determine CHECKIN and CHECKOUT based on the number of entries
                            let CHECKIN = null;
                            let CHECKOUT = null;

                            if (userLogs.record_time.length > 0) {
                                CHECKIN = userLogs.record_time[0].toString(); // Earliest log time

                                if (userLogs.record_time.length === 1) {
                                    CHECKOUT = CHECKIN; // If only one entry, CHECKOUT is the same as CHECKIN
                                } else {
                                    CHECKOUT = userLogs.record_time[userLogs.record_time.length - 1].toString(); // Latest log time
                                }
                            }

                            // Push the processed log into the result array
                            resultArray.push({
                                ...userLogs,
                                CHECKIN,
                                CHECKOUT
                            });
                        });
                    });

                    // Output the processed logs
                    console.log("Processed Attendance Logs:");
                    console.log(resultArray);

                });
            } catch (err) {
                console.error("Error processing attendance logs:", err);
            }
        };

        // Fetch and process attendance logs every 5 seconds
        setInterval(fetchAttendanceLogsFromFile, 5000);

    } catch (error) {
        console.error("Error:", error);
    }
};

manageAttendanceLogs();
