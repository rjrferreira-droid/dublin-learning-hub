"""Build and verify the UI using only the disposable local stack's publishable key."""
import json,os,subprocess,sys
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
subprocess.run(['npm','run','build'],env=env,check=True)
subprocess.run(['npx','--no-install','playwright','test','--config','playwright.local-platform.config.ts'],env=env,check=True)
