"""Minimal stdio MCP client for driving GITCRAFT servers directly."""
import json, subprocess, sys, os, threading, queue, time
MCP = "/home/user/GITCRAFT/scripts/mcp.sh"
os.environ.setdefault("GITCRAFT_ROOT","/home/user")
class Client:
    def __init__(self, name, extra=()):
        self.name=name
        self.p = subprocess.Popen([MCP, name, *extra], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  stderr=open(f"/home/user/pilot/tools/{name}.stderr.log","ab"), bufsize=0)
        self.q=queue.Queue(); self.id=0
        threading.Thread(target=self._rd, daemon=True).start()
        r=self.req("initialize",{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"pilot","version":"1"}})
        self.info=r
        self.note("notifications/initialized")
    def _rd(self):
        for line in self.p.stdout:
            try: self.q.put(json.loads(line))
            except Exception: pass
        self.q.put(None)
    def note(self,m,p=None):
        self.p.stdin.write((json.dumps({"jsonrpc":"2.0","method":m,**({"params":p} if p else {})})+"\n").encode())
    def req(self,m,p=None,timeout=600):
        self.id+=1; i=self.id
        self.p.stdin.write((json.dumps({"jsonrpc":"2.0","id":i,"method":m,"params":p or {}})+"\n").encode())
        end=time.time()+timeout
        while True:
            msg=self.q.get(timeout=max(1,end-time.time()))
            if msg is None: raise RuntimeError(f"{self.name} exited")
            if msg.get("id")==i:
                if "error" in msg: raise RuntimeError(json.dumps(msg["error"]))
                return msg["result"]
    def tools(self): return self.req("tools/list")["tools"]
    def call(self,tool,args=None,timeout=600):
        r=self.req("tools/call",{"name":tool,"arguments":args or {}},timeout)
        txt="\n".join(c.get("text","") for c in r.get("content",[]) if c.get("type")=="text")
        if r.get("isError"): raise RuntimeError(f"{tool}: {txt[:2000]}")
        try: return json.loads(txt)
        except Exception: return txt
    def close(self):
        try: self.p.stdin.close(); self.p.wait(5)
        except Exception: self.p.kill()
