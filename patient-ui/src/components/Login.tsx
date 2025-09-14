import React, { useState } from "react";

const Login: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Logging in with:", { username, password });
        // TODO: Call your backend API here for authentication
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-md">
                <h2 className="text-2xl font-bold text-center mb-6">IPD Portal</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username / Email */}
                    <div>
                        <label className="block mb-1 font-medium">Username or Email</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. admin@patient.com"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                            required
                        />
                    </div>

                    {/* Password with emoji toggle */}
                    <div>
                        <label className="block mb-1 font-medium">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                                required
                            />
                            {/* Eye emoji toggle */}
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 cursor-pointer select-none"
                                style={{ fontSize: "1.2rem" }}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </span>
                        </div>
                    </div>

                    {/* Sign In Button */}
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
                    >
                        Sign In
                    </button>
                </form>

                <p className="text-sm text-gray-500 text-center mt-4">
                    Forgot your password? Contact your IPD administrator.
                </p>
            </div>
        </div>
    );
};

export default Login;