import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import api from "../api/axiosInstance.js";
import { generateKeyPair, storeKeyPair, ensureBase64PemPublicKey, validatePublicKey } from "../helpers/cryptoUtils.js";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [username, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState(null);
  const [preview, setPreview] = useState(null); 
  const [error, setError] = useState("");

  const handleProfileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = "";

      if (profile) {
        const data = new FormData();
        data.append("file", profile);
        data.append("upload_preset", "chatapp_profiles");
        data.append("cloud_name", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

        const res = await api.post(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
          data
        );
        imageUrl = res.data.secure_url;
      }

      const signupRes = await api.post("/api/v1/users/signup", {
        username,
        email,
        password,
        profile: imageUrl || `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/v1763034660/149071_uc10n7.png`,
      });

      const userId = signupRes.data.data._id;

      // Generate cryptographic keypair (one-time on signup)
      const keyPair = await generateKeyPair();
      
      // Store private key locally (NEVER sent to backend)
      storeKeyPair(userId, keyPair);

      await login({ username, email, password });

      // Upload public key to backend (requires authenticated session)
      try {
        const publicKeyForUpload = await ensureBase64PemPublicKey(keyPair.publicKey);
        if (!validatePublicKey(publicKeyForUpload)) {
          throw new Error("Public key is invalid. Expected PEM with BEGIN PUBLIC KEY.");
        }
        await api.post("/api/v1/users/upload-public-key", {
          publicKey: publicKeyForUpload,
        });
        console.log("Public key uploaded successfully");
      } catch (keyUploadErr) {
        console.warn("Failed to upload public key, will retry on next login:", keyUploadErr);
      }

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-lg w-80 flex flex-col gap-4">
        <h1 className="text-white text-2xl text-center">Register</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          type="text"
          placeholder="Name"
          value={username}
          onChange={(e) => setUserName(e.target.value)}
          className="p-2 rounded bg-slate-700 text-white"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 rounded bg-slate-700 text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 rounded bg-slate-700 text-white"
          required
        />

        <div className="flex flex-col items-center gap-2">
          <label className="cursor-pointer">
            <div className="w-18 h-18 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-blue-500 transition">
              {preview ? (
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-sm">Add Photo</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfileChange}
              className="hidden"
            />
          </label>
        </div>

        <button
          type="submit"
          className="bg-green-500 text-white p-2 rounded hover:bg-green-600 cursor-pointer transition"
        >
          Register
        </button>
        <button className="text-white hover:underline cursor-pointer" onClick={() => navigate("/login")}>Already Logged In?</button>
      </form>
    </div>
  );
}





