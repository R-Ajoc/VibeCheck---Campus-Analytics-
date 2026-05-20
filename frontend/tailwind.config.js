export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        slideIn: {
          "0%": {
            transform: "translateX(400px) translateY(-20px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateX(0) translateY(0)",
            opacity: "1",
          },
        },
      },
      animation: {
        slideIn: "slideIn 0.5s ease-out",
      },
    },
  },
  plugins: [],
};
