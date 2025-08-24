document.addEventListener('DOMContentLoaded', () => {
    const output = document.getElementById('output');
    const input = document.getElementById('input');
    const promptEl = document.getElementById('prompt');
    const terminal = document.getElementById('terminal');
    const inputLine = document.getElementById('input-line');

    let commandHistory = [];
    let historyIndex = -1;
    let lastAutocompletePrefix = null;

    let state = {
        context: 'shell', // 'shell', 'rpc', 'root'
        cwd: '/home/hacker'
    };

    const fileSystem = {
        '/home/hacker': {
            'welcome.txt': `Bienvenido a los servidores de ProtoCorp.
Tu acceso es limitado. Demuestra tu valía.`,
            '.notes': `-- Notas del Desarrollador --
Chum, dejé el comando 'execute' habilitado en el servicio RPC para pruebas.
No olvideseliminarlo antes del despliegue.
Payload de prueba: 'kernel_panic_v2'.
- Bob`
        },
        '/root': {
            'flag.txt': 'root.\nCTF{3xpl01t_Rpc_S3rv1c3_Pr0t0c0rp}'
        }
    };

    const commands = {
        shell: {
            help: () => `Comandos disponibles:
  help      Muestra esta ayuda.
  ls [-a]   Lista los archivos del directorio.
  cat <file>Muestra el contenido de un archivo.
  scan      Escanea puertos locales en busca de servicios.
  connect <host:port> Conecta a un servicio.
  clear     Limpia la pantalla.`,
            ls: (args) => {
                const showHidden = args.includes('-a');
                let files = Object.keys(fileSystem[state.cwd]);
                if (!showHidden) {
                    files = files.filter(f => !f.startsWith('.'));
                }
                return files.join('\n');
            },
            cat: (args) => {
                const fileName = args[0];
                if (!fileName) return "Uso: cat <file>";
                const dir = fileSystem[state.cwd];
                if (dir && dir[fileName]) {
                    return dir[fileName];
                }
                return `cat: ${fileName}: No such file or directory`;
            },
            scan: () => `Escaneando localhost...
[+] Puerto abierto: 127.0.0.1:4444 - Servicio: Unknown RPC Service`,
            connect: (args) => {
                const target = args[0];
                if (target === '127.0.0.1:4444') {
                    state.context = 'rpc';
                    updatePrompt();
                    return 'Conectado a 127.0.0.1:4444. Escribe \'help\' para ver los comandos del servicio.';
                }
                return 'Error de conexión: host desconocido o no alcanzable.';
            },
        },
        rpc: {
            help: () => `Comandos del Servicio RPC:
  help      Muestra esta ayuda.
  status    Comprueba el estado del servicio.
  ping      Envía un paquete de prueba.
  exit      Cierra la conexión.`,
            status: () => 'Estado del servicio: 200 OK - En ejecución.',
            ping: () => 'pong',
            execute: async (args) => {
                const payload = args[0];
                if (payload === 'kernel_panic_v2') {
                    await runExploitSequence();
                    return '';
                }
                return 'ERROR: Payload inválido o ausente.';
            },
            exit: () => {
                state.context = 'shell';
                updatePrompt();
                return 'Conexión cerrada.';
            }
        },
        root: {
             ls: (args) => {
                state.cwd = '/root';
                const files = Object.keys(fileSystem[state.cwd]);
                return files.join('\n');
            },
            cat: (args) => {
                state.cwd = '/root';
                 const fileName = args[0];
                if (!fileName) return "Uso: cat <file>";
                const dir = fileSystem[state.cwd];
                if (dir && dir[fileName]) {
                    return dir[fileName];
                }
                return `cat: ${fileName}: No such file or directory`;
            }
        }
    };
    
    const sharedCommands = {
        hint: (args) => {
            const hintNum = args[0];
            switch(hintNum) {
                case '1': return "[PISTA 1]: ¿Has mirado bien a tu alrededor? A veces los archivos más interesantes no se ven a simple vista. Prueba a listar *todos* los archivos en tu directorio.";
                case '2': return "[PISTA 2]: Una nota de un desarrollador puede ser oro puro. El servicio parece tener más funcionalidades de las que anuncia en su ayuda.";
                case '3': return "[PISTA 3]: El comando 'execute' necesita un argumento específico para funcionar, el 'payload'. La nota que encontraste te da el nombre exacto.";
                default: return "Uso: hint <numero_pista> (ej: hint 1)";
            }
        },
        clear: () => {
            output.innerHTML = '';
            return '';
        }
    };

    function processCommand(fullCmd) {
        const [command, ...args] = fullCmd.trim().split(' ').filter(i => i);
        if (!command) return;

        let contextCommands = commands[state.context] || {};
        if(state.context === 'root') {
            contextCommands = {...commands.shell, ...commands.root};
        }
        
        const allCommands = {...contextCommands, ...sharedCommands};

        if (allCommands[command]) {
            const result = allCommands[command](args);
            if(result) printLine(result);
        } else {
            printLine(`${command}: command not found`);
        }
    }

    function printLine(text, isCommand = false) {
        const line = document.createElement('div');
        line.className = 'output-line';
        if (isCommand) {
            line.innerHTML = `<span class="prompt-display">${promptEl.textContent}</span> ${text}`;
        } else {
            line.textContent = text;
        }
        output.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
    }
    
    function updatePrompt() {
        switch (state.context) {
            case 'shell':
                promptEl.textContent = 'hacker@protocorp:~$ ';
                break;
            case 'rpc':
                promptEl.textContent = 'rpc-service> ';
                break;
            case 'root':
                promptEl.textContent = 'root@protocorp:~# ';
                break;
        }
    }
    
    async function runExploitSequence() {
        printLine("Ejecutando payload 'kernel_panic_v2'...");
        await sleep(1000);
        printLine("Payload aceptado. El sistema es vulnerable.");
        await sleep(1000);
        output.innerHTML += `<div class="system-message">[  0.000001] Kernel panic - not syncing: Attempted to kill init!
[  0.000002] CPU: 1 PID: 1 Comm: init Not tainted 5.4.0-77-generic
...
[  0.000008] Rebooting in 5 seconds.</div>`;
        await sleep(5000);
        output.innerHTML = '';
        printLine("System rebooted.");
        await sleep(1000);
        state.context = 'root';
        updatePrompt();
        printLine(`Bienvenido, root. La explotación ha sido un éxito.
Un archivo ha aparecido en tu directorio.`)
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = input.value;
            printLine(command, true);
            if (command) {
                commandHistory.unshift(command);
            }
            historyIndex = -1;
            processCommand(command);
            input.value = '';
            // Scroll to bottom after processing command
            terminal.scrollTop = terminal.scrollHeight;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                input.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                input.value = commandHistory[historyIndex];
            } else {
                historyIndex = -1;
                input.value = '';
            }
            lastAutocompletePrefix = null;
        } else if (e.key === 'Tab') {
            e.preventDefault();
            handleAutocomplete();
        } else {
            lastAutocompletePrefix = null;
        }
    });

    function handleAutocomplete() {
        const fullInput = input.value;
        const words = fullInput.split(' ');
        const currentWord = words[words.length - 1];

        if (!currentWord) return;

        const currentDir = state.context === 'root' ? '/root' : state.cwd;
        const filesAndDirs = Object.keys(fileSystem[currentDir] || {});

        const matches = filesAndDirs.filter(name => name.startsWith(currentWord));

        if (matches.length === 0) return;

        if (matches.length === 1) {
            const completedWord = matches[0];
            words[words.length - 1] = completedWord;
            input.value = words.join(' ') + ' ';
            lastAutocompletePrefix = null;
        } else {
            // Find the longest common prefix
            let commonPrefix = '';
            const firstMatch = matches[0];
            for (let i = 0; i < firstMatch.length; i++) {
                const char = firstMatch[i];
                if (matches.every(match => match[i] === char)) {
                    commonPrefix += char;
                } else {
                    break;
                }
            }

            if (commonPrefix.length > currentWord.length) {
                // If we can extend the current word, do it.
                words[words.length - 1] = commonPrefix;
                input.value = words.join(' ');
                lastAutocompletePrefix = commonPrefix;
            } else if (lastAutocompletePrefix === currentWord) {
                // If Tab is pressed again on the same word, show options
                printLine(fullInput, true);
                printLine(matches.join('  '));
                lastAutocompletePrefix = null;
            } else {
                 lastAutocompletePrefix = currentWord;
            }
        }
    }

    terminal.addEventListener('click', () => {
        input.focus();
    });

    async function init() {
        printLine("Estableciendo conexión SSH con 13.37.13.37...", false);
        await sleep(1500);
        printLine("Conexión establecida.", false);
        await sleep(500);
        printLine("Autenticando como 'hacker'...", false);
        await sleep(1000);
        printLine("Autenticación correcta. Bienvenido.", false);
        printLine("--------------------------------------------------", false);
        printLine(commands.shell.cat(['welcome.txt']));
        updatePrompt();
        terminal.appendChild(inputLine);
        input.focus();
    }

    init();
});
