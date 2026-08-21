[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$lucenePath = "C:\Program Files\PROSIS\PROSIS Offline\Lucene.Net.dll"
[System.Reflection.Assembly]::LoadFrom($lucenePath) | Out-Null

$indexPath = "C:\ProgramData\PROSIS\PROSIS Offline\GuidedDiagnosticsSearchIndex_643"
$dir = [Lucene.Net.Store.FSDirectory]::Open([System.IO.DirectoryInfo]::new($indexPath))
$reader = [Lucene.Net.Index.IndexReader]::Open($dir, $true)

$dtcMap = [System.Collections.Generic.Dictionary[string, object]]::new()

for ($i = 0; $i -lt $reader.NumDocs(); $i++) {
    $doc = $reader.Document($i)
    if ($doc.Get("LanguageId") -eq "9") {
        $sys = $doc.Get("IsoDtcFcSystemCode")
        $icn = $doc.Get("IsoDtcIcnIsoNumber")
        $ftb = $doc.Get("IsoDtcFtbIsoNumber")
        $dtc = "$sys$icn$ftb".Trim()
        
        if ([string]::IsNullOrWhiteSpace($dtc)) {
            $dtc = $doc.Get("SaeTitle")
            if ([string]::IsNullOrWhiteSpace($dtc)) { continue }
        }
        
        $title = $doc.Get("IsoIndexTitle")
        $comp = $doc.Get("IsoDtcFcName")
        $ftbName = $doc.Get("IsoDtcFtbName")
        $ecu = $doc.Get("IsoNodeTypeName")
        $msg = $doc.Get("MachineDisplayMessage")
        
        if (-not $dtcMap.ContainsKey($dtc)) {
            $dtcMap[$dtc] = [PSCustomObject]@{
                dtc = $dtc
                modelType = "볼보 굴삭기 (Volvo Excavator)"
                factory = "창원 / 한국"
                serialStart = "0"
                serialEnd = "999999"
                ecu = if ([string]::IsNullOrWhiteSpace($ecu)) { "컨트롤 유니트 (ECU)" } else { $ecu }
                compFull = if ([string]::IsNullOrWhiteSpace($comp)) { $title } else { $comp }
                standard = "ISO 14229 / SAE J1939"
                event = if ([string]::IsNullOrWhiteSpace($ftbName)) { "고장 감지" } else { $ftbName }
                symptom = if ([string]::IsNullOrWhiteSpace($msg)) { $title } else { $msg }
                condition = "시동 ON 또는 장비 운용 중"
                preDtc = "없음"
                causes = "센서/액추에이터 이상, 배선 단선/단락, 커넥터 접촉 불량"
                actions = "관련 하네스/배선 점검, 커넥터 체결 상태 확인, 부품 점검 및 교환"
                mode = "overwrite"
            }
        }
    }
}

$reader.Dispose()
$dir.Dispose()

$items = [System.Collections.Generic.List[object]]::new($dtcMap.Values)
$jsonPath = "d:\허강\프로그램\DD관리프로그램\volvo_excavator_dtc_korean.json"
$items | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding UTF8
"Saved $($items.Count) unique Korean DTC records to $jsonPath"
