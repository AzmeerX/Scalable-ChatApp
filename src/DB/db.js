const connectDB = async () => {
    try {
        const connection = await mongoose.connect(`${process.env.MONGODB_URL}/myDB`);
        return connection.connection.host;
    } catch (error) {
        console.log(`Error: ${error}`);
    }
};

export { connectDB };