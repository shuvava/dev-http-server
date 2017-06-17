const HttpSrv = require('dev-http-server');

const httpSrv = new HttpSrv();

httpSrv.setJson('/test', 'src/db.json', 'id', false);

HttpSrv.run({ httpSrv });
