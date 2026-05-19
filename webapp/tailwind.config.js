// import defaultTheme from "tailwindcss/defaultTheme"
import plugin from "tailwindcss/plugin"

/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    container: {
      center: true,
    },
    extend: {
      height: {
        chat: "calc(100vh - 8rem)",
      },
      letterSpacing: {
        "extra-wide": "0.15em",
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(0,0,0,0.05)",
        education:
          "0 18px 42px -28px color-mix(in oklch, var(--education-ink) 34%, transparent)",
      },
      colors: {
        education: {
          paper: "var(--education-paper)",
          "paper-strong": "var(--education-paper-strong)",
          ink: "var(--education-ink)",
          sage: "var(--education-sage)",
          "sage-foreground": "var(--education-sage-foreground)",
          gold: "var(--education-gold)",
          "gold-foreground": "var(--education-gold-foreground)",
          line: "var(--education-line)",
        },
      },
      strokeWidth: {
        1.5: "1.5",
      },
      fontSize: {
        dot: "0.5625rem", // 9px  — timeline dots, micro labels
        "2xs": "0.625rem", // 10px — badges, tracking labels
        "3xs": "0.6875rem", // 11px — secondary metadata
        "xs-sm": "0.8rem", // ~13px — calendar, subtle text
        caption: "0.8125rem", // 13px — strikethrough prices
        body: "0.9375rem", // 15px — card titles
        "10xl": "10rem",
        "11xl": "11rem",
        "12xl": "12rem",
        "13xl": "13rem",
        "14xl": "14rem",
        "15xl": "15rem",
      },
      screens: {
        "3xs": "20rem", // 320px - Small mobile
        "2xs": "22.5rem", // 360px - Mobile
        "2xs-plus": "23.4375rem", // 375px - iPhone SE, iPhone 6/7/8
        xs: "25.75rem", // 412px - iPhone Plus (nhóm 390-430px)
        "xs-plus": "30rem", // 480px - Large mobile
        sm: "33.75rem", // 540px - Small tablet
        md: "48rem", // 768px - Tablet portrait
        "md-820": "51.25rem", // 820px - iPad Air portrait
        "md-plus": "53.3125rem", // 853px - Medium-large tablet
        "md-lg": "57rem", // 912px - Large tablet portrait
        lg: "64rem", // 1024px - Tablet landscape / Small desktop
        xl: "80rem", // 1280px - Desktop
        "2xl": "96rem", // 1536px - Large desktop
      },
    },
  },
  plugins: [
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "anim-delay": (value) => ({
            "animation-delay": value,
          }),
        },
        { values: theme("transitionDelay") }
      )
    }),
  ],
}

export default config
