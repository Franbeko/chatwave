import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { MessageCircleIcon, MailIcon, LoaderIcon, LockIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });

  const { login, isLoggingIn } = useAuthStore();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const success = await login(formData);

    if (success) {
      navigate("/");
    }
  };

  return (
    <div className="w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="relative w-full max-w-5xl md:h-[600px] h-[550px]">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row h-full">
            
            {/* FORM COLUMN */}
            <div className="md:w-1/2 p-6 flex items-center justify-center md:border-r border-slate-600/30 h-full overflow-y-auto">
              <div className="w-full max-w-sm">

                {/* HEADER - Compact */}
                <div className="text-center mb-5">
                  <MessageCircleIcon className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                  <h2 className="text-xl font-bold text-slate-200 mb-1">
                    Welcome Back
                  </h2>
                  <p className="text-sm text-slate-400">
                    Sign in to start chatting.
                  </p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* EMAIL */}
                  <div>
                    <label className="auth-input-label text-sm">Email</label>

                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                      <input
                        type="email"
                        className="input pl-9 py-2 h-10 text-sm w-full bg-slate-700/50 border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder="johndoe@gmail.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <label className="auth-input-label text-sm">Password</label>

                    <div className="relative">
                      <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                      <input
                        type="password"
                        className="input pl-9 py-2 h-10 text-sm w-full bg-slate-700/50 border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* BUTTON */}
                  <button
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 h-10 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <LoaderIcon className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Sign In"
                    )}
                  </button>

                </form>

                <div className="mt-4 text-center">
                  <Link to="/signup" className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline">
                    Don't have an account? Sign Up
                  </Link>
                </div>

              </div>
            </div>

            {/* RIGHT SIDE IMAGE - Compact */}
            <div className="hidden md:w-1/2 md:flex flex-col items-center justify-center p-4 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <img
                src="/login.png"
                alt="People using mobile devices"
                className="w-4/5 h-auto max-h-48 object-contain"
              />

              <div className="mt-3 text-center">
                <h3 className="text-base font-medium text-cyan-400">
                  Connect anytime, anywhere
                </h3>

                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <span className="px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded-full">Free Messaging</span>
                  <span className="px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded-full">Easy Setup</span>
                  <span className="px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded-full">Private & Secure</span>
                </div>
              </div>
            </div>

          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}

export default LoginPage;