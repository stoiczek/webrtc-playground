#!/usr/bin/python
#
# Tiny HTTP server (2009/11/25 - Aaron Drew)
#
# Adapted very very basic HTTP server at:
#    http://www.pasteur.fr/formation/infobio/web/cours/ch01s02.html
#
# NOTE: This is VERY insecure. No checks are done on .. paths. Don't run on a public IP.
#
from BaseHTTPServer import HTTPServer
from BaseHTTPServer import BaseHTTPRequestHandler
import os.path

class myHandler(BaseHTTPRequestHandler):
    
    def do_GET(self):

        if self.path == "/kill.html":
            exit(0)

        truepath = os.path.join(os.path.dirname(__file__), self.path[1:])
        if truepath.find("?") != -1:
            truepath = truepath[:truepath.find("?")]
        if truepath.find("#") != -1:
            truepath = truepath[:truepath.find("#")]
        if truepath[-1:] == "/":
            print "appending index.html to %s" % truepath
            truepath = os.path.join(truepath,"index.html")
            print "truepath is now %s" % truepath
        if os.path.isfile(truepath):
            mimetypes = {"css":"text/css","html":"text/html","js":"application/x-javascript",
                "swf":"application/x-shockwave-flash","png":"image/png","application":"application/x-ms-application",
                "manifest":"application/x-ms-manifest","deploy":"application/octet-stream", "crx": "application/x-chrome-extension"}
            content_type = mimetypes.get(truepath[truepath.rfind(".")+1:],"text/html")
            self.printCustomHTTPResponse(200, content_type) 
            self.wfile.write(open(truepath,"rb").read()) 
        else:
            self.printCustomHTTPResponse(404) 
            self.wfile.write("<html>\n<body>\n")
            self.wfile.write("<h1>404 - File Not Found</h1>")
            self.wfile.write("<p>GET string: " + self.path + "</p>" )
            self.wfile.write("truepath: %s" % truepath)
            self.printBrowserHeaders()
            self.wfile.write("</body>\n</html>\n")

    def printBrowserHeaders(self):
        keys = self.headers.dict.keys()                                   
        self.wfile.write("\n<ul>")
        for key in keys:
            self.wfile.write("\n<li><b>" + key + "</b>: ")
            self.wfile.write(self.headers.dict[key] + "\n</li>\n")
        self.wfile.write("</ul>\n")

    def printCustomHTTPResponse(self, respcode, content_type="text/html"):
        self.send_response(respcode)
        self.send_header("Content-Type", content_type)
        self.send_header("Server", "myHandler")
        self.end_headers()

    def log_request(self, code='-', size='-'):
        pass

if __name__ == "__main__":
    server = HTTPServer(('',8080), myHandler)
    while True:
        server.handle_request()

