const path = require('path');
const nodeExternals = require('webpack-node-externals');

const nodeSrc  = path.resolve(__dirname, 'src/node')
const nodeDist = path.resolve(__dirname, 'dist')
const webJsSrc  = path.resolve(__dirname, 'src/web/js')
const webScssSrc  = path.resolve(__dirname, 'src/web/scss')
const webDist = path.resolve(__dirname, 'static/js')

const nodeConfig = {
    mode: 'development',
    target: 'node',
    externals: [nodeExternals()],
    entry: ['@babel/polyfill', nodeSrc + '/main.js'],
    output: {
        path: nodeDist,
        filename: 'server.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js']
    },
    plugins: []
};

const webConfig = {
    mode: 'development',
    target: 'web',
    entry: ['@babel/polyfill', webJsSrc + '/index.js', webScssSrc + '/index.scss'],
    output: {
        path: webDist,
        filename: 'client.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            }
        ]
    },
    resolve: {
        extensions: ['.js']
    },
    externals: [
        {
            jquery: 'jQuery'
        }
    ],
    plugins: []
};

module.exports = [nodeConfig, webConfig];
