import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // for redirecting

const Login: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const response = await axios.post("https://your-api-url.com/login", {
                username,
                password,
            });

            const { token } = response.data; // assuming API returns { token: "JWT" }
            localStorage.setItem("token", token); // save JWT
            navigate("/dashboard"); // redirect after login
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Login failed. Please try again.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-md">
                <h2 className="text-2xl font-bold text-center mb-6">IPD Portal</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username */}
                    <div>
                        <label className="block mb-1 font-medium">Username or Email</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. alice.smith"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block mb-1 font-medium">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

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
