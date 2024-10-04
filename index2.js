const fs = require("fs"); // Import the file system module
const Zkteco = require("zkteco-js");

const manageZktecoDevice = async () => {
    const device = new Zkteco("192.168.68.201", 4370, 5200, 50000);
    let lastRetrievedLogs = [];

    try {
        // Create socket connection to the device
        await device.createSocket();
        console.log("Connected to the device.");

        // Function to fetch and check attendance logs
        const fetchAttendanceLogs = async () => {
            try {
                const attendanceLogs = await device.getAttendances();
                console.log("Attendance Logs Structure:", JSON.stringify(attendanceLogs, null, 2));

                // Ensure attendanceLogs is an array or an object with a logs array
                let logsArray;
                if (Array.isArray(attendanceLogs)) {
                    logsArray = attendanceLogs; // It's already an array
                } else if (attendanceLogs && Array.isArray(attendanceLogs.data)) {
                    logsArray = attendanceLogs.data; // Adjust according to the actual structure
                } else {
                    console.error("Attendance logs are not in the expected array format.");
                    return; // Exit the function if the format is not as expected
                }

                // Get the last 10 logs
                const lastTenLogs = logsArray.slice(-5);
                
                // Check for new logs
                const newLogs = lastTenLogs.filter(log => !lastRetrievedLogs.some(lastLog => lastLog.sn === log.sn));

                // Update lastRetrievedLogs for the next check
                lastRetrievedLogs = lastTenLogs;

                if (newLogs.length > 0) {
                    console.log("New Attendance Logs:", newLogs);

                    // Save the last 10 logs to a text file
                    fs.writeFile('last_10_attendance_logs.txt', JSON.stringify(lastTenLogs, null, 2), (err) => {
                        if (err) {
                            console.error("Error saving logs:", err);
                        } else {
                            console.log("Last 10 attendance logs saved to last_10_attendance_logs.txt.");
                        }
                    });
                }
            } catch (err) {
                console.error("Error fetching attendance logs:", err);
            }
        };

        // Fetch attendance logs every 5 seconds
        // setInterval(fetchAttendanceLogs, 5000);

    } catch (error) {
        console.error("Error:", error);
    }
};

manageZktecoDevice();