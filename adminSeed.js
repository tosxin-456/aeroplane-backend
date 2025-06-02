const bcrypt = require("bcryptjs");
const Admin = require("./models/admin.model"); 

const seedAdmin = async () => {
    try {
        // Admin details
        const firstName = "Tosin";
        const lastName = "Poppins";
        const email = "tosinpoppins@gmail.com";
        const role = "super_admin";
        const password = "admin123"; 
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ where: { email } });
        if (existingAdmin) {
            console.log("Admin already exists.");
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new admin
        await Admin.create({
            firstName,
            lastName,
            email,
            role,
            password: hashedPassword,
        });

        console.log("Admin seeded successfully.");
    } catch (error) {
        console.error("An error occurred while seeding the admin:", error.message);
    } finally {
        process.exit();
    }
};

seedAdmin();
