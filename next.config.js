/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  
  // ═══════════════════════════════════════════════════════════
  // 🚀 PERFORMANCE OPTIMIZATIONS
  // ═══════════════════════════════════════════════════════════
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Code splitting optimization
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor code splitting
            default: false,
            vendors: false,
            
            // Common chunks
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 10,
            },
            
            // React and React-DOM
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              chunks: 'all',
              priority: 20,
            },
            
            // Large libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1];
                return `lib.${packageName.replace('@', '')}`;
              },
              priority: 15,
            },
          },
        },
        
        // Minimize bundle size
        minimize: true,
        
        // Runtime chunk
        runtimeChunk: {
          name: 'runtime',
        },
      };
    }

    // Custom loader for Web Workers
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });

    return config;
  },

  // ═══════════════════════════════════════════════════════════
  // 📦 COMPRESSION
  // ═══════════════════════════════════════════════════════════
  compress: true,

  // ═══════════════════════════════════════════════════════════
  // 🎯 PRODUCTION OPTIMIZATIONS
  // ═══════════════════════════════════════════════════════════
  productionBrowserSourceMaps: false,
  
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ═══════════════════════════════════════════════════════════
  // 🔧 EXPERIMENTAL FEATURES
  // ═══════════════════════════════════════════════════════════
  experimental: {
    // Optimize CSS
    optimizeCss: true,
    
    // Optimize package imports
    optimizePackageImports: ['lucide-react'],
  },

  // ═══════════════════════════════════════════════════════════
  // 📱 PWA SUPPORT (Optional)
  // ═══════════════════════════════════════════════════════════
  // Uncomment to enable PWA
  // pwa: {
  //   dest: 'public',
  //   disable: process.env.NODE_ENV === 'development',
  // },
};

module.exports = nextConfig;