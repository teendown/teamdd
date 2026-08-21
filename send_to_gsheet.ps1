[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$jsonPath = "d:\허강\프로그램\DD관리프로그램\volvo_excavator_dtc_korean.json"
$url = "https://script.google.com/macros/s/AKfycbzV5H2kowUqmGNO2UloeU_2OMYT0ZbyyzsS3iN4LXLhY_WvZ1maxiIOZ9jvvCg99aM/exec"
$logPath = "d:\허강\프로그램\DD관리프로그램\sync_progress.log"

$items = Get-Content $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$total = $items.Count
"Total records to upload: $total" | Tee-Object -FilePath $logPath

$success = 0
$fail = 0

for ($i = 0; $i -lt $total; $i++) {
    $item = $items[$i]
    $body = @{
        dtc = $item.dtc
        modelType = $item.modelType
        factory = $item.factory
        serialStart = $item.serialStart
        serialEnd = $item.serialEnd
        ecu = $item.ecu
        compFull = $item.compFull
        standard = $item.standard
        event = $item.event
        symptom = $item.symptom
        condition = $item.condition
        preDtc = $item.preDtc
        causes = $item.causes
        actions = $item.actions
        mode = "overwrite"
    }

    $retries = 3
    $sent = $false
    while ($retries -gt 0 -and -not $sent) {
        try {
            $res = Invoke-RestMethod -Uri $url -Method Post -Body $body -TimeoutSec 15 -MaximumRedirection 5
            if ($res.status -eq "success") {
                $success++
                $sent = $true
            } else {
                $retries--
                Start-Sleep -Milliseconds 500
            }
        } catch {
            $retries--
            Start-Sleep -Milliseconds 500
        }
    }

    if (-not $sent) {
        $fail++
    }

    if (($i + 1) % 10 -eq 0 -or ($i + 1) -eq $total) {
        $msg = "[$(Get-Date -Format 'HH:mm:ss')] Progress: $($i + 1) / $total (Success: $success, Fail: $fail) - Latest DTC: $($item.dtc)"
        $msg | Tee-Object -FilePath $logPath -Append
    }

    Start-Sleep -Milliseconds 150
}

"Completed! Total: $total, Success: $success, Fail: $fail" | Tee-Object -FilePath $logPath -Append
