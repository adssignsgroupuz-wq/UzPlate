import { useState, useRef, useEffect } from 'react'
import { Download, ChevronRight, Info, ShieldCheck, Loader2 } from 'lucide-react'
import { jsPDF } from 'jspdf'
import * as opentype from 'opentype.js'
import { svg2pdf } from 'svg2pdf.js'

function App() {
    const [region, setRegion] = useState('01')
    const [number, setNumber] = useState('O 000 OO')
    const [plateWidth, setPlateWidth] = useState(520)
    const [plateHeight, setPlateHeight] = useState(112)
    const [isDownloading, setIsDownloading] = useState(false)
    const [fonts, setFonts] = useState(null)
    const svgRef = useRef(null)

    // Pre-load fonts for better performance
    useEffect(() => {
        const loadFonts = async () => {
            try {
                const [euroRes, arialRes] = await Promise.all([
                    fetch('/fonts/EuroPlate.ttf'),
                    fetch('/fonts/ArialBold.ttf')
                ])

                if (!euroRes.ok || !arialRes.ok) throw new Error('Shriftlarni yuklab bo\'lmadi')

                const [euroBuf, arialBuf] = await Promise.all([
                    euroRes.arrayBuffer(),
                    arialRes.arrayBuffer()
                ])

                setFonts({
                    euro: opentype.parse(euroBuf),
                    arial: opentype.parse(arialBuf)
                })
            } catch (err) {
                console.error('Font loading error:', err)
            }
        }
        loadFonts()
    }, [])

    const handleDownload = async () => {
        if (!svgRef.current || isDownloading) return
        
        if (!fonts) {
            alert('Shriftlar hali yuklanmagan. Iltimos, bir soniya kuting.')
            return
        }

        setIsDownloading(true)

        try {
            const { euro: euroFont, arial: arialBoldFont } = fonts

            // Use fallback dimensions if zero, negative, or blank
            const outWidth = plateWidth > 0 ? plateWidth : 520
            const outHeight = plateHeight > 0 ? plateHeight : 112

            // Clone SVG so we don't modify the live preview
            const svgClone = svgRef.current.cloneNode(true)
            
            // Force the exported SVG to stretch and fill the custom dimensions perfectly
            svgClone.setAttribute('preserveAspectRatio', 'none')

            // Convert every <text> element to a <path> element
            const textElements = Array.from(svgClone.querySelectorAll('text'))

            for (const textEl of textElements) {
                const text = textEl.textContent?.trim() || ''
                if (!text) continue

                const x = parseFloat(textEl.getAttribute('x') || '0')
                const y = parseFloat(textEl.getAttribute('y') || '0')
                const fill = textEl.getAttribute('fill') || '#000000'
                const textAnchor = textEl.getAttribute('text-anchor') || 'start'

                // Determine which font to use: Arial Bold for UZ, Euro Plate for numbers
                const inlineStyle = textEl.getAttribute('style') || ''
                const font = inlineStyle.toLowerCase().includes('arial') || inlineStyle.toLowerCase().includes('helvetica')
                    ? arialBoldFont
                    : euroFont

                // Parse font size from Tailwind class e.g. text-[7055px]
                const cls = textEl.getAttribute('class') || ''
                const sizeMatch = cls.match(/text-\[(\d+(?:\.\d+)?)px\]/)
                const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 7055

                // Check for textLength attribute (stretches text to exact width)
                const svgTextLength = parseFloat(textEl.getAttribute('textLength') || textEl.getAttribute('text-length') || '0')

                // Measure natural text width for centering
                const testPath = font.getPath(text, 0, 0, fontSize)
                const bbox = testPath.getBoundingBox()
                const naturalWidth = bbox.x2 - bbox.x1

                // Compute x position based on textAnchor
                let startX = x
                if (svgTextLength > 0) {
                    startX = x
                } else if (textAnchor === 'middle') {
                    startX = x - bbox.x1 - naturalWidth / 2
                } else if (textAnchor === 'end') {
                    startX = x - naturalWidth
                }

                // Dominant-baseline handling
                const domBaseline = textEl.getAttribute('dominant-baseline') || 'auto'
                const renderY = (domBaseline === 'central' || domBaseline === 'middle')
                    ? y + fontSize * 0.36
                    : y

                // Generate the path
                const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
                pathEl.setAttribute('fill', fill)

                if (svgTextLength > 0 && naturalWidth > 0) {
                    const scaleX = svgTextLength / naturalWidth
                    const rawPath = font.getPath(text, 0, renderY, fontSize)
                    pathEl.setAttribute('d', rawPath.toPathData(2))
                    pathEl.setAttribute('transform', `translate(${startX - bbox.x1 * scaleX}, 0) scale(${scaleX}, 1)`)
                } else {
                    const pathObj = font.getPath(text, startX, renderY, fontSize)
                    pathEl.setAttribute('d', pathObj.toPathData(2))
                }

                textEl.parentNode?.replaceChild(pathEl, textEl)
            }

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [outWidth, outHeight]
            })

            // Fix: usage of svg2pdf.js v2
            await svg2pdf(svgClone, doc, {
                x: 0,
                y: 0,
                width: outWidth,
                height: outHeight
            })

            doc.save(`license_plate_${region}_${number.replace(/\s/g, '_')}.pdf`)
        } catch (error) {
            console.error('Download error:', error)
            alert('Xatolik yuz berdi: ' + error.message)
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#202124]">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 px-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-google-blue flex items-center justify-center text-white font-bold">U</div>
                    <span className="text-xl font-medium tracking-tight">UzPlate <span className="text-gray-400 font-normal">Generator</span></span>
                </div>
                <nav className="hidden md:flex items-center gap-6">
                    <a href="#" className="text-sm font-medium hover:text-google-blue transition-colors">Yaratish</a>
                    <a href="#" className="text-sm font-medium text-gray-500 hover:text-google-blue transition-colors">Qo'llanma</a>
                    <a href="#" className="text-sm font-medium text-gray-500 hover:text-google-blue transition-colors">Biz haqimizda</a>
                </nav>
            </header>

            <main className="pt-32 pb-20 px-4 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Controls */}
                    <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight mb-2">Avtoraqam Yarating</h1>
                            <p className="text-gray-500 text-lg">Vektor formatida yuqori sifatli avtoraqamlarni generatsiya qiling.</p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 ml-1">Viloyat kodi</label>
                                <input
                                    type="text"
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value.toUpperCase().slice(0, 2))}
                                    className="w-full h-14 px-4 bg-[#F1F3F4] rounded-2xl border-none focus:ring-2 focus:ring-google-blue outline-none text-lg transition-all"
                                    placeholder="01"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 ml-1">Raqam (masalan: O 000 OO)</label>
                                <input
                                    type="text"
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value.toUpperCase().slice(0, 10))}
                                    className="w-full h-14 px-4 bg-[#F1F3F4] rounded-2xl border-none focus:ring-2 focus:ring-google-blue outline-none text-lg transition-all"
                                    placeholder="O 000 OO"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 ml-1">Kenglik (mm)</label>
                                    <input
                                        type="number"
                                        value={plateWidth || ''}
                                        onChange={(e) => setPlateWidth(Number(e.target.value))}
                                        className="w-full h-14 px-4 bg-[#F1F3F4] rounded-2xl border-none focus:ring-2 focus:ring-google-blue outline-none text-lg transition-all"
                                        placeholder="520"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 ml-1">Balandlik (mm)</label>
                                    <input
                                        type="number"
                                        value={plateHeight || ''}
                                        onChange={(e) => setPlateHeight(Number(e.target.value))}
                                        className="w-full h-14 px-4 bg-[#F1F3F4] rounded-2xl border-none focus:ring-2 focus:ring-google-blue outline-none text-lg transition-all"
                                        placeholder="112"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="w-full h-16 bg-google-blue hover:bg-primary-dark disabled:bg-gray-400 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Yuklanmoqda...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        PDF yuklab olish
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <ShieldCheck className="text-google-blue shrink-0" />
                            <p className="text-sm text-blue-800 leading-relaxed">
                                Generatsiya qilingan fayl vektor formatida bo'ladi, bu esa uning sifatini yo'qotmasdan har qanday o'lchamda chop etish imkonini beradi.
                            </p>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="lg:col-span-7 order-1 lg:order-2 flex items-center justify-center">
                        <div className="w-full space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Jonli Ko'rinish</h3>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                </div>
                            </div>

                            <div className="w-full flex items-center justify-center">
                                <div className="bg-white rounded-3xl p-4 md:p-8 shadow-2xl shadow-gray-200 border border-gray-100 flex items-center justify-center overflow-hidden w-full aspect-[520/112]">
                                    <svg
                                        ref={svgRef}
                                        viewBox="0 0 52000 11200"
                                        className="w-full h-auto drop-shadow-xl"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                    {/* Background and Plate Structure */}
                                    <path fill="#000" d="M1498.87 4.93l49000 0c825,0 1500,675 1500,1500l0 8199.99c0,825.01 -675,1500.01 -1500,1500.01l-49000 0c-825,0 -1500,-675 -1500,-1500.01l0 -8199.99c0,-825 675,-1500 1500,-1500z" />
                                    <path fill="#FFF" d="M11748.86 504.93l38750.01 0c550,0 1000,450.03 1000,1000l0 8199.99c0,549.97 -450.03,1000 -1000,1000l-38750.01 0 0 -10199.99z" />
                                    <path fill="#FFF" d="M1498.88 504.93l9749.98 0 0 10199.99 -9749.98 0c-549.97,0 -1000,-450 -1000,-1000l0 -8199.99c0,-550 450,-1000 1000,-1000z" />

                                    {/* Region Code — dominantBaseline=central lets browser use real font metrics */}
                                    <text
                                        x="6373"
                                        y="5604"
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="text-[7055px] fill-black"
                                        style={{ fontFamily: "'Euro Plate', monospace" }}
                                    >
                                        {region}
                                    </text>

                                    {/* Main Number — dominantBaseline=central for perfect vertical center */}
                                    <text
                                        x="28959"
                                        y="5604"
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="text-[8800px] fill-black"
                                        style={{ fontFamily: "'Euro Plate', monospace" }}
                                    >
                                        {number}
                                    </text>

                                    {/* Flag and UZ - centered in right panel (46170-49670, center: 47920) */}
                                    <g>
                                        <text
                                            x="47920"
                                            y="8600"
                                            textAnchor="middle"
                                            fill="#00BAB3"
                                            className="text-[2600px]"
                                            style={{ fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "bold" }}
                                        >UZ</text>
                                        <rect fill="#FEFEFE" x="46170" y="2333" width="3500" height="2500" />
                                        <path fill="#ED162D" d="M46170 3133l3500 0 0 50 -3500 0 0 -50zm3500 850l0 50 -3500 0 0 -50 3500 0z" />
                                        <polygon fill="#2F8738" points="46170,4033 49670,4033 49670,4833 46170,4833 " />
                                        <polygon fill="#2F80F6" points="46170,2333 49670,2333 49670,3133 46170,3133 " />
                                        <path fill="#FFF" d="M46870 2433c17,0 33,1 50,4 -141,23 -250,147 -250,295 0,148 108,272 250,295 -16,2 -32,4 -50,4 -165,0 -300,-134 -300,-300 0,-165 134,-300 300,-300z" />
                                        <path fill="#FFF" d="M47530 2913l-13 41 -43 0 35 25 -13 41 35 -25 35 25 -13 -41 35 -25 -43 0 -13 -41zm-275-131l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm0 240l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm-240 0l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm960-480l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm0 240l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm0 240l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm-240-480l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm0 240l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm0 240l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm-240-480l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25zm0 240l13-41 -35-25 43 0 13-41 13 41 43 0 -35 25 13 41 -35-25 -35 25z" />
                                    </g>
                                </svg>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-google-yellow/10 flex items-center justify-center text-google-yellow">
                                    <Info size={24} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Maslahat</h4>
                                    <p className="text-sm text-gray-500">PDF faylni Adobe Illustrator yoki CorelDRAW'da tahrirlashingiz mumkin.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-200 bg-white">
                <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 grayscale brightness-50 opacity-50">
                        <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center text-white text-[10px] font-bold">U</div>
                        <span className="text-sm font-medium">UzPlate Generator</span>
                    </div>
                    <p className="text-sm text-gray-400">© 2026 UzPlate. Barcha huquqlar himoyalangan.</p>
                    <div className="flex gap-6">
                        <a href="#" className="text-gray-400 hover:text-google-blue transition-colors"><ChevronRight size={18} /></a>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default App
