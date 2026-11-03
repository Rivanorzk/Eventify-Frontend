/** @type {import('next').NextConfig} */
const nextConfig = {
    allowedDevOrigins: [
        'bullseye-attribute-glacier.ngrok-free.dev'],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
        ],
    },
};

export default nextConfig;