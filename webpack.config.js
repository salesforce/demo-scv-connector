require('custom-env').env();

module.exports = {
    entry: {
        main: './src/main/index.js',
        remote: './src/remote-control/main.js',
        login: './src/login/index.js'
    },
    devServer: {
        https: true,
        contentBase: __dirname + '/public',
        host: '0.0.0.0',
        proxy: {
            '/api': process.env.SERVER_URL
        },
        disableHostCheck: true,
        index: '/app_debug.html',
        historyApiFallback: {
            index: 'app_debug.html',
            rewrites: [
                {from: /^\/$/, to: 'app_debug.html'},
                {from: /^\/remote/, to: 'remote.html'},
                {from: /^\/login/, to: 'login.html'}
            ]
        }
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    output: {
        publicPath: '/assets/',
        path: __dirname + '/dist/',
        filename: '[name].bundle.js'
    }
};
