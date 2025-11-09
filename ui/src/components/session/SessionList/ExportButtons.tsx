import { Download } from 'lucide-react'
import type { Session } from '../../../types'
import { exportSessionsAsJSON, exportSessionsAsCSV } from '../SessionUtils/exportUtils'

interface ExportButtonsProps {
  sessions: Session[]
}

export default function ExportButtons({ sessions }: ExportButtonsProps) {
  const handleExportJSON = () => {
    exportSessionsAsJSON(sessions)
  }

  const handleExportCSV = () => {
    exportSessionsAsCSV(sessions)
  }

  return (
    <div className="export-buttons">
      <button
        className="btn-icon"
        onClick={handleExportJSON}
        title="Export as JSON"
      >
        <Download size={14} />
        JSON
      </button>
      <button
        className="btn-icon"
        onClick={handleExportCSV}
        title="Export as CSV"
      >
        <Download size={14} />
        CSV
      </button>
    </div>
  )
}