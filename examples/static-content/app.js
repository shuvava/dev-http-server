const HttpSrv = require('dev-http-server');

const httpSrv = new HttpSrv();

httpSrv.setStatic('/', '/www', 'index.html');

HttpSrv.run({ httpSrv });
