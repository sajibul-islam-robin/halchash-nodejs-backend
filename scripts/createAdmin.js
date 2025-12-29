import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Admin } from '../models/halchash_models.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/halchash');
    console.log('✅ Connected to MongoDB');

    const email = process.argv[2] || 'admin@halchash.com';
    const password = process.argv[3] || 'admin123';
    const username = process.argv[4] || 'admin';
    const fullName = process.argv[5] || 'Super Admin';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('❌ Admin with this email already exists');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      username,
      email,
      password: hashedPassword,
      full_name: fullName,
      role: 'super_admin'
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: super_admin`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();

