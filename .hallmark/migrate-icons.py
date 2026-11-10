from pathlib import Path
import re,os
names=set()
for p in Path('src').rglob('*'):
 if p.suffix not in ['.tsx','.ts']:continue
 for m in re.finditer(r'import\s*\{([^}]+)\}\s*from\s*[\x27\x22]lucide-react[\x27\x22]',p.read_text(encoding='utf-8'),re.S):names.update(x.strip() for x in m[1].split(',') if x.strip())
replacements=dict(pair.split(':') for pair in '''AlertCircle:WarningCircle AlertTriangle:Warning ArrowUpDown:ArrowsDownUp Ban:Prohibit BarChart3:ChartBar Calendar:CalendarBlank CheckCircle2:CheckCircle ChevronDown:CaretDown ChevronRight:CaretRight ChevronUp:CaretUp Download:DownloadSimple Edit3:PencilSimpleLine FileCheck2:ClipboardText FileDown:FileArrowDown FileSpreadsheet:FileXls HelpCircle:Question History:ClockCounterClockwise Layers:Stack Lock:LockKey LogOut:SignOut MessageSquare:ChatText Radio:Broadcast RefreshCw:ArrowsClockwise RotateCcw:ArrowCounterClockwise Scale:Scales Search:MagnifyingGlass Server:HardDrives Share2:ShareNetwork ShieldAlert:ShieldWarning Smartphone:DeviceMobile Sparkles:Sparkle Trash2:Trash TrendingUp:TrendUp Tv:Television Upload:UploadSimple Zap:Lightning'''.split())
mapping={n:replacements.get(n,n) for n in names};base=Path('node_modules/@phosphor-icons/react/dist/csr')
missing=[(k,v) for k,v in mapping.items() if not (base/(v+'.d.ts')).exists()]
if missing:raise RuntimeError(str(missing))
icons=Path('src/lib/icons.tsx')
code="import { forwardRef } from 'react';\nimport type { Icon, IconProps } from '@phosphor-icons/react';\nimport {\n"+',\n'.join('  '+x+'Icon' for x in sorted(set(mapping.values())))+"\n} from '@phosphor-icons/react';\n\n"
code+='''const themedIcon = (Glyph: Icon): Icon => forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <Glyph aria-hidden={props['aria-label'] ? undefined : true} {...props} ref={ref} weight={props.weight ?? 'duotone'} />
));

'''
code+='\n'.join(f'export const {name} = /* @__PURE__ */ themedIcon({glyph}Icon);' for name,glyph in sorted(mapping.items()))+'\n';icons.write_text(code,encoding='utf-8')
count=0
for p in Path('src').rglob('*'):
 if p.suffix not in ['.tsx','.ts'] or p==icons:continue
 s=p.read_text(encoding='utf-8')
 if 'lucide-react' not in s:continue
 rel=os.path.relpath(icons.with_suffix(''),p.parent).replace('\\','/')
 if not rel.startswith('.'):rel='./'+rel
 s=s.replace("from 'lucide-react'",f"from '{rel}'").replace('from "lucide-react"',f'from "{rel}"');p.write_text(s,encoding='utf-8');count+=1
print(f'Migrated {count} source files and {len(mapping)} icon aliases to Phosphor duotone.')
p=Path('src/tokens.css');s=p.read_text(encoding='utf-8').replace("'Plus Jakarta Sans', 'Noto Sans Tamil'","'DM Sans', 'Noto Sans Tamil'");p.write_text(s,encoding='utf-8')
for p in [Path('index.html'),Path('.hallmark/preview.html'),Path('.hallmark/dialog-preview.html')]:
 if not p.exists():continue
 s=p.read_text(encoding='utf-8');s=re.sub(r'family=Plus\+Jakarta\+Sans:wght@[^&\"]+', 'family=DM+Sans:wght@400;500;700',s);p.write_text(s,encoding='utf-8')
p=Path('design.md');s=p.read_text(encoding='utf-8').replace('Plus Jakarta Sans','DM Sans');s+='\nIcons: Phosphor React, duotone by default, through src/lib/icons.tsx. Icon aliases keep existing view/handler wiring stable. Tamil retains Noto Sans Tamil; IDs and amounts retain the mono face.\n';p.write_text(s,encoding='utf-8')
