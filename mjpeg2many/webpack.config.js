const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const nodeSrc  = path.resolve(__dirname, 'src/node')
const nodeDist = path.resolve(__dirname, 'dist')
const webJsSrc  = path.resolve(__dirname, 'src/web/js')
const webScssSrc  = path.resolve(__dirname, 'src/web/scss')
const webJsDist = path.resolve(__dirname, 'static/js')
const webCssDist = path.resolve(__dirname, 'static/css')

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

const webJsConfig = {
    mode: 'development',
    target: 'web',
    entry: {
        index: [
            '@babel/polyfill',
            webJsSrc + '/index.js',
        ],
    },
    output: {
        path: webJsDist,
        filename: '[name].js'
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
    plugins: [
        new webpack.ProvidePlugin({
            Popper: ['popper.js', 'default'],
        })
    ]
};

const webCssConfig = {
    mode: 'development',
    target: 'web',
    entry: {
        main: webScssSrc + '/main.scss',
    },
    output: {
        path: webCssDist,
        filename: '[name].css'
    },
    module: {
        rules: [
            {
                test: /\.scss$/,
                exclude: /node_modules/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {},
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            plugins: function () {
                                return [
                                    require('precss'),
                                    require('autoprefixer')
                                ];
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {},
                    }
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.css', '.js']
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: './[name].css'
        })
    ]
};

module.exports = [nodeConfig, webJsConfig, webCssConfig];
