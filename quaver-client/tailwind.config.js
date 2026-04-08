import plugin from "tailwindcss/plugin";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-black": "#000000",
        "brand-surface": "#121212",
        "brand-grey": "#A1A1AA",
        "spotify-green": "#1DB954",
      },
      boxShadow: {
        glow: "0 0 40px rgba(29, 185, 84, 0.18)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top left, rgba(29, 185, 84, 0.18), transparent 38%), radial-gradient(circle at bottom right, rgba(64, 64, 64, 0.3), transparent 32%)",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities, theme }) => {
      addUtilities({
        ".scrollbar-brand": {
          "scrollbar-width": "thin",
          "scrollbar-color": `${theme("colors.spotify-green")} transparent`,
        },
        ".scrollbar-brand::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        ".scrollbar-brand::-webkit-scrollbar-track": {
          background: "transparent",
        },
        ".scrollbar-brand::-webkit-scrollbar-thumb": {
          "background-color": "rgba(29, 185, 84, 0.45)",
          "border-radius": "9999px",
        },
        ".scrollbar-brand::-webkit-scrollbar-thumb:hover": {
          "background-color": "rgba(29, 185, 84, 0.72)",
        },
      });
    }),
  ],
};
