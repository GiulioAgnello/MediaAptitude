<?php
/**
 * ma-restore.php — ripristino manuale di un backup .wpress (All-in-One WP Migration)
 * Uso (una volta sola, poi CANCELLARE il file):
 *   1) https://www.media-aptitude.it/ma-restore.php?k=KEY&step=extract
 *   2) https://www.media-aptitude.it/ma-restore.php?k=KEY&step=db
 */
const KEY = '80d77a4ad91868ea78d1ce61';
if (!isset($_GET['k']) || !hash_equals(KEY, (string) $_GET['k'])) { http_response_code(404); exit; }

@set_time_limit(0);
@ignore_user_abort(true);
@ini_set('memory_limit', '512M');
header('Content-Type: text/plain; charset=utf-8');
@ini_set('display_errors', '1');
error_reporting(E_ALL);
while (ob_get_level() > 0) { @ob_end_flush(); }
ob_implicit_flush(true);
set_error_handler(function ($no, $str, $file, $line) { if (!(error_reporting() & $no)) return true; echo "PHP[$no]: $str (riga $line)\n"; flush(); return true; });
register_shutdown_function(function () { $e = error_get_last(); if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) { echo "FATAL: {$e['message']} (riga {$e['line']})\n"; } echo "-- fine script --\n"; });

$root       = __DIR__;
$wpContent  = $root . '/wp-content';
$backupDir  = $wpContent . '/ai1wm-backups';
$sqlFile    = $backupDir . '/ma-database.sql';
$step       = $_GET['step'] ?? '';

function cstr($s) { $p = strpos($s, "\0"); return $p === false ? $s : substr($s, 0, $p); }
function out($m) { echo $m . "\n"; @flush(); }

if ($step === 'peek') {
    $files = glob($backupDir . '/*.wpress');
    if (!$files) { out('ERRORE: nessun .wpress'); exit; }
    $fh = fopen($files[0], 'rb');
    for ($i = 0; $i < 15 && !feof($fh); $i++) {
        $hdr = fread($fh, 4377);
        $name = cstr(substr($hdr, 0, 255));
        $size = cstr(substr($hdr, 255, 14));
        $mt   = cstr(substr($hdr, 269, 12));
        $path = cstr(substr($hdr, 281, 4096));
        out("#$i name=[" . $name . "] size=[" . $size . "] mtime=[" . $mt . "] path=[" . substr($path, 0, 200) . "]");
        if (!ctype_digit($size)) { out('HEX: ' . bin2hex(substr($hdr, 0, 64))); break; }
        fseek($fh, (int) $size, SEEK_CUR);
    }
    out('wp-content scrivibile: ' . (is_writable($wpContent) ? 'si' : 'NO'));
    exit;
}

if ($step === 'extract') {
    $files = glob($backupDir . '/*.wpress');
    if (!$files) { out('ERRORE: nessun .wpress in ' . $backupDir); exit; }
    usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
    $archive = $files[0];
    out('Archivio: ' . basename($archive) . ' (' . round(filesize($archive) / 1048576, 1) . ' MB)');

    $fh = fopen($archive, 'rb');
    $count = 0; $bytes = 0;
    while (!feof($fh)) {
        $hdr = fread($fh, 4377);
        if ($hdr === '' || $hdr === false) break;
        if (strlen($hdr) < 4377) { out('ATTENZIONE: header troncato'); break; }
        if (trim($hdr, "\0") === '') break; // EOF block
        $name = cstr(substr($hdr, 0, 255));
        $size = (int) cstr(substr($hdr, 255, 14));
        $path = cstr(substr($hdr, 281, 4096));

        $rel = ($path === '.' || $path === '') ? $name : $path . '/' . $name;
        $rel = ltrim(str_replace('\\', '/', $rel), '/');
        if (strpos($rel, '..') !== false) { fseek($fh, $size, SEEK_CUR); continue; }

        if ($rel === 'database.sql') {
            $dest = $sqlFile;
        } elseif (in_array($rel, ['package.json', 'multisite.json', 'blogs.json', 'settings.json'], true)) {
            $dest = $backupDir . '/ma-' . $rel;
        } else {
            $dest = $wpContent . '/' . $rel;
        }
        if (!is_dir(dirname($dest))) mkdir(dirname($dest), 0755, true);

        if (is_dir($dest)) { out('SKIP (e\' una cartella): ' . $rel); fseek($fh, $size, SEEK_CUR); continue; }
        $w = @fopen($dest, 'wb');
        if (!$w) { out('ERRORE scrittura: ' . $rel); fseek($fh, $size, SEEK_CUR); continue; }
        $left = $size;
        while ($left > 0) {
            $chunk = fread($fh, min(1048576, $left));
            if ($chunk === '' || $chunk === false) break;
            fwrite($w, $chunk);
            $left -= strlen($chunk);
        }
        fclose($w);
        $count++; $bytes += $size;
        if ($count % 200 === 0) out("... $count file estratti — ultimo: $rel");
    }
    fclose($fh);
    out("OK: $count file estratti (" . round($bytes / 1048576, 1) . ' MB).');
    out(file_exists($sqlFile) ? 'database.sql pronto (' . round(filesize($sqlFile) / 1048576, 1) . ' MB). Ora esegui step=db' : 'ERRORE: database.sql non trovato nell\'archivio');
    exit;
}

if ($step === 'db') {
    if (!file_exists($sqlFile)) { out('ERRORE: esegui prima step=extract'); exit; }
    $cfg = file_get_contents($root . '/wp-config.php');
    $get = function ($c) use ($cfg) {
        return preg_match("/define\(\s*['\"]" . $c . "['\"]\s*,\s*['\"](.*?)['\"]\s*\)/", $cfg, $m) ? stripcslashes($m[1]) : null;
    };
    preg_match('/\$table_prefix\s*=\s*[\'"](.*?)[\'"]/', $cfg, $pm);
    $prefix = $pm[1] ?? 'wp_';
    $host = $get('DB_HOST') ?: 'localhost';

    $db = new mysqli($host, $get('DB_USER'), $get('DB_PASSWORD'), $get('DB_NAME'));
    if ($db->connect_error) { out('ERRORE DB: ' . $db->connect_error); exit; }
    $db->set_charset('utf8mb4');
    $db->query('SET FOREIGN_KEY_CHECKS=0');
    $db->query("SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO'");
    out('DB: ' . $get('DB_NAME') . ' — prefisso: ' . $prefix);

    // 1) elimina le tabelle dell'installazione vuota
    $res = $db->query("SHOW TABLES LIKE '" . $db->real_escape_string(addcslashes($prefix, '_%')) . "%'");
    $dropped = 0;
    while ($row = $res->fetch_row()) { $db->query('DROP TABLE IF EXISTS `' . $row[0] . '`'); $dropped++; }
    out("Tabelle vuote eliminate: $dropped");

    // 2) importa
    $fh = fopen($sqlFile, 'rb');
    $buf = ''; $n = 0; $err = 0;
    while (($line = fgets($fh)) !== false) {
        if ($buf === '' && (trim($line) === '' || strpos(ltrim($line), '--') === 0 || strpos(ltrim($line), '/*') === 0)) continue;
        $buf .= $line;
        if (substr(rtrim($line), -1) !== ';') continue;
        $q = str_replace('SERVMASK_PREFIX_', $prefix, $buf);
        $q = str_replace(['utf8mb4_0900_ai_ci', 'utf8mb4_unicode_520_ci'], 'utf8mb4_unicode_ci', $q);
        if (!$db->query($q)) { $err++; if ($err <= 20) out('ERR: ' . $db->error . ' :: ' . substr($q, 0, 120)); }
        $n++; $buf = '';
        if ($n % 1000 === 0) out("... $n query");
    }
    fclose($fh);
    $db->query('SET FOREIGN_KEY_CHECKS=1');

    $r = $db->query("SELECT option_name, option_value FROM `{$prefix}options` WHERE option_name IN ('siteurl','home')");
    while ($r && $o = $r->fetch_assoc()) out($o['option_name'] . ' = ' . $o['option_value']);
    out("OK: $n query eseguite, $err errori.");
    out('Ora: login con le vecchie credenziali, Impostazioni > Permalink > Salva. Poi CANCELLA ma-restore.php e wp-content/ai1wm-backups/ma-database.sql');
    exit;
}

out('Parametro step mancante (extract | db)');
