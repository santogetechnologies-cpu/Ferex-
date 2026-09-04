@echo off
cd /d "C:\Users\Admin\Desktop\Ferex"
git add src/lib/api/digital.ts
git commit -m "fix: seed guard prevents deleted data from resurrecting on refresh"
git push origin main
echo DONE > push_result.txt
