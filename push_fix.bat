@echo off
cd /d "C:\Users\Admin\Desktop\Ferex"
git add -A
git commit -m "fix: comprehensive sync, remove mock resurrection, and add client portals for Digital, Trade, and Rimi"
git push origin main
echo DONE > push_result.txt
