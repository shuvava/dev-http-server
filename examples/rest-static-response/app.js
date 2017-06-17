const HttpSrv = require('dev-http-server');

const httpSrv = new HttpSrv();

httpSrv.onGet('/page', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const obj = {
        results: [{
            text: 'Group 1',
            children: [
                { id: 1, text: 'element 1' },
                { id: 2, text: 'element 2' },
            ],
        }, {
            text: 'Group 2',
            children: [
                { id: 3, text: 'element 3' },
                { id: 4, text: 'element 4' },
            ],
        },
        { id: 5, text: 'element 5' },
        ],
    };
    res.end(JSON.stringify(obj));
});

httpSrv.onPost('/page', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Page Two');
});

HttpSrv.run({ httpSrv });
