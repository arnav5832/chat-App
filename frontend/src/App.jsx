import { useEffect, useRef, useState } from "react";
import { connectWS } from "./ws";

export default function App() {
    const timer = useRef(null);
    const socket = useRef(null);
    const [userName, setUserName] = useState("");
    const [showNamePopup, setShowNamePopup] = useState(true);
    const [inputName, setInputName] = useState("");
    const [typer,setTypers] = useState([])
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");

    useEffect(() => {
        socket.current = connectWS()

        socket.current.on("connect", () => {
            socket.current.on('roomNotice', (userName) => {
                console.log(`${userName} joined the group!`)
            })
        })

        socket.current.on('chatMessage', (msg) => {
            //push to existing messages list
            console.log("msg", msg);
            setMessages((prev) => [...prev, msg])
        })

        socket.current.on('typing', (userName) => {
            setTypers((prev) => {
                const isExist = prev.find((typer) => typer === userName)

                if(!isExist) return [...prev,userName]

                return prev;
            })
        })

        socket.current.on('stopTyping', (userName) => {
            setTypers((prev) => prev.filter((typer) => typer !== userName))
        })

        return () => {
            socket.current.off('connect')
            socket.current.off('chatMessage')
            socket.current.off('typing')
            socket.current.off('stopTyping')
        }

    },[])


    useEffect(() => {
        if(text) {
            socket.current.emit('typing', userName);
            clearTimeout(timer.current)
        }

        timer.current =  setTimeout(() => {
            socket.current.emit('stopTyping', userName)
        }, 1000)

        return () => {
            clearTimeout(timer.current)
        }

    },[text,userName])

    // FORMAT TIME
    function formatTime(ts) {
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
    }

    // NAME SUBMIT
    function handleNameSubmit(e) {
        e.preventDefault();
        const trimmed = inputName.trim();
        if (!trimmed) return;

        //join room
        socket.current.emit('joinRoom',trimmed)

        setUserName(trimmed);
        setShowNamePopup(false);
    }

    // SEND MESSAGE
    function sendMessage() {
        const t = text.trim();
        if (!t) return;

        const msg = {
            id: Date.now(),
            sender: userName,
            text: t,
            ts: Date.now(),
        };

        setMessages((m) => [...m, msg]);

        //emit
        socket.current.emit('chatMessage', msg);

        setText("");
    }

    // ENTER KEY
    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4 font-inter">

            {/* NAME POPUP */}
            {showNamePopup && (
                <div className="fixed inset-0 flex items-center justify-center z-40">
                    <div className="bg-white rounded-xl shadow-lg max-w-md p-6">
                        <h1 className="text-xl font-semibold text-black">
                            Enter your name
                        </h1>

                        <form onSubmit={handleNameSubmit} className="mt-4">
                            <input
                                autoFocus
                                value={inputName}
                                onChange={(e) => setInputName(e.target.value)}
                                className="w-full border px-3 py-2 rounded-md"
                                placeholder="Your name"
                            />
                            <button className="block ml-auto mt-3 px-4 py-1.5 rounded-full bg-green-500 text-white">
                                Continue
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* CHAT UI */}
            {!showNamePopup && (
                <div className="w-full max-w-2xl h-[90vh] bg-white rounded-xl shadow-md flex flex-col overflow-hidden">

                    {/* HEADER */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                        <div className="h-10 w-10 rounded-full bg-[#075E54] flex items-center justify-center text-white font-semibold">
                            R
                        </div>

                        <div className="flex-1">
                            <div className="text-sm font-medium text-[#303030]">
                                Realtime group chat
                            </div>

                            {typer.length ?   (<div className="text-xs text-gray-500">
                                        {typer.join(',')} is typing...
                                </div>) : ("")
                            }

                        </div>

                        <div className="text-sm text-gray-500">
                            Signed in as{" "}
                            <span className="font-medium capitalize">
                                {userName}
                            </span>
                        </div>
                    </div>

                    {/* MESSAGE LIST */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-100 flex flex-col">
                        {messages.map((m) => {
                            const mine = m.sender === userName;

                            return (
                                <div
                                    key={m.id}
                                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[78%] p-3 my-2 rounded-[18px] text-sm shadow-sm ${
                                            mine
                                                ? "bg-[#DCF8C6] rounded-br-2xl"
                                                : "bg-white rounded-bl-2xl"
                                        }`}
                                    >
                                        <div>{m.text}</div>

                                        <div className="flex justify-between mt-1 text-[11px] gap-10">
                                            <div className="font-bold">{m.sender}</div>
                                            <div className="text-gray-500">
                                                {formatTime(m.ts)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* INPUT */}
                    <div className="px-4 py-3 border-t bg-white">
                        <div className="flex gap-2 border rounded-full px-3 py-2">
                            <textarea
                                rows={1}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                className="w-full resize-none outline-none"
                            />

                            <button
                                onClick={sendMessage}
                                className="bg-green-500 text-white px-4 py-1 rounded-full"
                            >
                                Send
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}