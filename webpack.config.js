const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/client/index.tsx',
  resolve: {
    extensions: ['.wasm', '.mjs', '.js', '.json', '.ts', '.tsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: [
            'style-loader',
            'css-loader',
            'resolve-url-loader',
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                sourceMapContents: false
              }
            }
        ]
      },
      {
          test: /\.(woff(2)?|ttf|eot|svg|png|jpg)(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
              loader: 'file-loader',
              options: {
                  name: '[name].[ext]',
                  outputPath: 'assets/'
              }
          }]
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin(['src/client/index.html', 'src/client/PushServiceWorker.js'])
  ],
  devServer: {
    port: 8081,
    proxy: {
      '/ws/**': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
        secure: false
      },
      '/PushServiceWorker.js': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/assets': 'http://localhost:8080'
    }
  }
};