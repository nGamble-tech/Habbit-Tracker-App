import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

export function PageTransition({ children, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function PopButton({ children, ...rest }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.15, ease }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
