"""Install only the authored package into the disposable CLI loopback database."""
import json,os,subprocess,sys
from pathlib import Path
from urllib.parse import urlparse,unquote
status=json.loads(Path(sys.argv[1]).read_text())
u=urlparse(status['DB_URL']);api=urlparse(status['API_URL'])
assert u.scheme in ('postgres','postgresql') and u.hostname in ('127.0.0.1','localhost') and u.port==54322 and u.path=='/postgres','local DB only'
assert api.scheme=='http' and api.hostname in ('127.0.0.1','localhost') and api.port==54321,'local API only'
assert not os.environ.get('SUPABASE_ACCESS_TOKEN'),'No connected token permitted'
env={**os.environ,'PGPASSWORD':unquote(u.password or '')}
args=['psql','-h',u.hostname,'-p',str(u.port),'-U',unquote(u.username or ''),'-d','postgres','-v','ON_ERROR_STOP=1']
subprocess.run([*args,'-f',str(Path(sys.argv[2]).resolve())],env=env,check=True)
subprocess.run([*args,'-c',"NOTIFY pgrst, 'reload schema';"],env=env,check=True)
