import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { MessageCircleIcon, LockIcon, MailIcon, UserIcon, LoaderIcon } from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";

function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { signup, isSigningUp } = useAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();

    const { fullName, email, password } = formData;

    // check empty fields
    if (!fullName || !email || !password) {
      toast.error("All fields are required");
      return;
    }

    // strong password rule
    const strongPassword = /^(?=.*[A-Z])(?=.*[0-9]).{6,}$/;

    if (!strongPassword.test(password)) {
      toast.error(
        "Password must be at least 6 characters and include a capital letter and a number."
      );
      return;
    }

    signup(formData);
  };

  return (
    <div className="w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="relative w-full max-w-5xl md:h-[650px] h-[600px]">
        <BorderAnimatedContainer>
          <div className="w-full flex flex-col md:flex-row h-full">

            {/* FORM COLUMN */}
            <div className="md:w-1/2 p-6 flex items-center justify-center md:border-r border-slate-600/30 h-full overflow-y-auto">
              <div className="w-full max-w-sm">

                {/* HEADER - Compact */}
                <div className="text-center mb-4">
                  <MessageCircleIcon className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                  <h2 className="text-xl font-bold text-slate-200 mb-1">
                    Create Account
                  </h2>
                  <p className="text-sm text-slate-400">
                    Join ChatWave and start chatting.
                  </p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-3">

                  {/* FULL NAME */}
                  <div>
                    <label className="auth-input-label text-sm">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fullName: e.target.value,
                          })
                        }
                        className="input pl-9 py-2 h-10 text-sm w-full bg-slate-700/50 border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className="auth-input-label text-sm">Email</label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            email: e.target.value,
                          })
                        }
                        className="input pl-9 py-2 h-10 text-sm w-full bg-slate-700/50 border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder="johndoe@gmail.com"
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
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        className="input pl-9 py-2 h-10 text-sm w-full bg-slate-700/50 border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder="Create a strong password"
                      />
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Must contain at least 6 characters, one capital letter and one number.
                    </p>
                  </div>

                  {/* BUTTON */}
                  <button
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 h-10 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    type="submit"
                    disabled={isSigningUp}
                  >
                    {isSigningUp ? (
                      <LoaderIcon className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>

                {/* LOGIN LINK */}
                <div className="mt-3 text-center">
                  <Link to="/login" className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline">
                    Already have an account? Login
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE IMAGE - Compact */}
            <div className="hidden md:w-1/2 md:flex flex-col items-center justify-center p-4 bg-gradient-to-bl from-slate-800/20 to-transparent">
              <img
                src="/signup.png"
                alt="ChatWave signup illustration"
                className="w-4/5 h-auto max-h-40 object-contain"
              />

              <div className="mt-3 text-center">
                <h3 className="text-base font-medium text-cyan-400">
                  Your Chat Journey Starts Here
                </h3>

                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Connect with friends, family, and colleagues instantly on ChatWave.
                </p>

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

export default SignUpPage;