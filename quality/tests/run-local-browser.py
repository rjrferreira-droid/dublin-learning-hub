"""Build and verify the UI using only the disposable local stack's publishable key."""
import json,os,subprocess,sys,time
from urllib.request import urlopen
from pathlib import Path
from urllib.parse import urlparse
status_path=Path(sys.argv[1]).resolve()
status=json.loads(status_path.read_text())
api=urlparse(status['API_URL'])
assert api.scheme=='http' and api.hostname in ('localhost','127.0.0.1') and api.port==54321
assert not os.environ.get('SUPABASE_ACCESS_TOKEN')
fixture=status_path.parent/'local-browser-fixture.json'
assert fixture.is_file() and fixture.stat().st_mode&0o077==0
env={**os.environ,'VITE_SUPABASE_URL':status['API_URL'],'VITE_SUPABASE_PUBLISHABLE_KEY':status['ANON_KEY'],'LH_BROWSER_FIXTURE':str(fixture)}
subprocess.run(['node','--experimental-strip-types','quality/tests/prepare-local-recovery.mjs',str(status_path)],env=env,check=True)
env['LH_RECOVERY_FIXTURE']=str(status_path.parent/'local-recovery-receipts.json')
subprocess.run(['npm','run','build'],env=env,check=True)
subprocess.run(['npx','--no-install','esbuild','quality/tests/local-recovery-client.ts','--bundle','--platform=browser','--format=iife','--global-name=LHRecoveryAcceptance','--outfile=dist/local-recovery-acceptance.js'],env=env,check=True)
log_path=status_path.parent/'local-professor-server.log'
with log_path.open('w') as log:
    os.chmod(log_path,0o600)
    server=subprocess.Popen(['node','--experimental-strip-types','quality/tests/local-professor-server.mjs',str(status_path)],env=env,stdout=log,stderr=log)
    try:
        deadline=time.monotonic()+15
        while True:
            assert server.poll() is None, 'Local route server ended unexpectedly'
            try:
                with urlopen('http://127.0.0.1:4174/health',timeout=1) as response:
                    assert json.load(response)=={'ready':True}
                break
            except OSError:
                if time.monotonic()>=deadline: raise RuntimeError('Local route server did not become ready')
                time.sleep(0.1)
        subprocess.run(['npx','--no-install','playwright','test','--config','playwright.local-platform.config.ts'],env=env,check=True)
    finally:
        server.terminate()
        try: server.wait(timeout=10)
        except subprocess.TimeoutExpired: server.kill();server.wait(timeout=5)
        subprocess.run(['node','quality/tests/assert-local-browser-clean.mjs',str(status_path)],env=env,check=True)
