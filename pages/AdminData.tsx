import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { 
  FileSpreadsheet, Upload, RefreshCw, Check, AlertTriangle, Database, 
  Download, Users, Search, ChevronLeft, ChevronRight, Eye, Save, UserPlus, X, Eraser,
  CreditCard, Calendar, Hash, School as SchoolIcon, Layout, Bus, HeartPulse,
  ArrowUpDown, ArrowUp, ArrowDown, Layers, Trash2, Lock, Edit3, CheckSquare, Square, MinusSquare
} from 'lucide-react';
import { RegistryStudent, School, SchoolType } from '../types';

// Helper functions defined outside component
const normalizeKey = (key: string) => {
  return key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

const parseCoordinate = (val: any): number => {
    if (!val) return 0;
    const strVal = String(val).replace(',', '.');
    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
};

const parseCSV = (text: string): any[] => {
  const lines = text.split(/\r\n|\n/);
  if (lines.length === 0) return [];
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  const headers = firstLine.split(separator).map(h => normalizeKey(h.trim()));
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const obj: any = {};
    const currentline = lines[i].split(separator);
    for (let j = 0; j < headers.length; j++) {
      const val = currentline[j] ? currentline[j].trim().replace(/^"|"$/g, '') : '';
      obj[headers[j]] = val;
    }
    if (Object.keys(obj).some(k => obj[k])) {
      result.push(obj);
    }
  }
  return result;
};

const mapSchoolsFromData = (data: any[]): School[] => {
  return data.map((item: any, index: number) => {
    let types: SchoolType[] = [];
    const rawType = (item.tipo || item.types || item.modalidade || '').toLowerCase();
    
    if (rawType.includes('infantil') || rawType.includes('creche') || rawType.includes('pre')) types.push(SchoolType.INFANTIL);
    if (rawType.includes('fundamental')) {
       if (rawType.includes('1') || rawType.includes('i') || rawType.includes('inicial')) types.push(SchoolType.FUNDAMENTAL_1);
       if (rawType.includes('2') || rawType.includes('ii') || rawType.includes('final')) types.push(SchoolType.FUNDAMENTAL_2);
       if (!types.includes(SchoolType.FUNDAMENTAL_1) && !types.includes(SchoolType.FUNDAMENTAL_2)) types.push(SchoolType.FUNDAMENTAL_1);
    }
    if (rawType.includes('medio')) types.push(SchoolType.MEDIO);
    if (rawType.includes('eja')) types.push(SchoolType.EJA);
    if (types.length === 0) types.push(SchoolType.INFANTIL); // Default

    return {
      id: item.id || item.codigo || `school_${Date.now()}_${index}`,
      inep: item.inep || item.codigo || item.codinep || '',
      name: item.nome || item.name || item.escola || item.unidade || 'Escola Importada',
      address: item.endereco || item.address || item.localizacao || 'Endereço não informado',
      types: types,
      image: item.image || item.imagem || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80',
      rating: parseFloat(item.rating || item.nota || item.avaliacao) || 4.5,
      availableSlots: parseInt(item.capacidade || item.vagas || item.availableslots) || 0,
      lat: parseCoordinate(item.lat || item.latitude),
      lng: parseCoordinate(item.lng || item.longitude)
    };
  });
};

const mapStudentsFromData = (data: any[]): RegistryStudent[] => {
  return data.map((item: any, index: number) => {
    const name = (item.name || item.nome || item.nomedoaluno || item.aluno || 'Aluno Sem Nome').toUpperCase();
    const cpfRaw = item.cpf || item.doc || item.documento || '';
    const cpf = cpfRaw.replace(/\D/g, '');
    const birthDateRaw = item.birthdate || item.nascimento || item.datadenascimento || item.dtnasc || '';
    
    const statusRaw = item.status || item.situacao || 'Matriculado';
    let status: RegistryStudent['status'] = 'Matriculado';
    if (statusRaw.toLowerCase().includes('pendente')) status = 'Pendente';
    if (statusRaw.toLowerCase().includes('analise')) status = 'Em Análise';

    return {
      id: item.id || item.matricula || item.codigo || item.ra || `student_${Date.now()}_${index}`,
      enrollmentId: item.enrollmentid || item.protocolo || item.matricula || item.codigomatricula || '',
      name: name,
      birthDate: formatDate(birthDateRaw),
      cpf: cpf,
      status: status,
      school: item.school || item.escola || item.unidadeescolar || item.creche || '',
      grade: item.grade || item.etapa || item.serie || item.ano || '',
      shift: item.shift || item.turno || item.periodo || '',
      className: item.classname || item.turma || item.nometurma || '',
      classId: item.classid || item.codturma || item.codigoturma || '',
      transportRequest: (item.transport || item.transporte || item.utilizatransporte || '').toString().toLowerCase().includes('sim'), 
      transportType: item.transporttype || item.tipotransporte || item.veiculo || '',
      specialNeeds: (item.specialneeds || item.deficiencia || item.nee || item.aee || '').toString().toLowerCase().includes('sim')
    };
  });
};

// Internal Confirmation Modal
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", confirmColor = "bg-red-600" }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full relative p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4 text-slate-800">
          <div className="bg-slate-100 p-2 rounded-full">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-white font-bold rounded-lg hover:opacity-90 transition shadow-lg ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Bulk Action Modal
const BulkActionModal = ({ isOpen, onClose, type, onConfirm }: { isOpen: boolean, onClose: () => void, type: 'status' | 'class', onConfirm: (data: any) => void }) => {
    const [status, setStatus] = useState('Matriculado');
    const [className, setClassName] = useState('');
    const [grade, setGrade] = useState('');
    const [shift, setShift] = useState('Matutino');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (type === 'status') {
            onConfirm({ status });
        } else {
            onConfirm({ className, grade, shift });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">
                        {type === 'status' ? 'Alterar Status em Massa' : 'Atribuir Turma em Massa'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
                </div>
                
                <div className="space-y-4 mb-6">
                    {type === 'status' ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Novo Status</label>
                            <select 
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="Matriculado">Matriculado</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Em Análise">Em Análise</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-2">Isso atualizará o status de todos os alunos selecionados.</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Turma</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: 1º ANO A"
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Etapa / Série</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: Fundamental I"
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
                                    <select 
                                        value={shift}
                                        onChange={(e) => setShift(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Matutino">Matutino</option>
                                        <option value="Vespertino">Vespertino</option>
                                        <option value="Noturno">Noturno</option>
                                        <option value="Integral">Integral</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200">Cancelar</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export const AdminData: React.FC = () => {
  const { schools, students, updateSchools, updateStudents, removeStudent, resetData, lastBackupDate, registerBackup } = useData();
  const { addToast } = useToast();
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  
  // Feedback States
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackDetails, setFeedbackDetails] = useState<string[]>([]);

  // Preview/Confirmation States
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [importType, setImportType] = useState<'schools' | 'students' | 'educacenso' | null>(null);
  const [educacensoSchool, setEducacensoSchool] = useState<School | null>(null); 

  // Reset Confirmation
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // View State
  const [activeTab, setActiveTab] = useState<'students' | 'classes'>('students');

  // Student List Inspection States
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos'); 
  const [classFilter, setClassFilter] = useState('Todas');   
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<RegistryStudent | null>(null);
  const itemsPerPage = 10;
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof RegistryStudent; direction: 'asc' | 'desc' } | null>(null);

  // Mass Allocation State
  const [targetSchoolId, setTargetSchoolId] = useState('');
  const [allocationMessage, setAllocationMessage] = useState('');

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionModal, setBulkActionModal] = useState<{ isOpen: boolean, type: 'status' | 'class' | 'delete' }>({ isOpen: false, type: 'status' });

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // Simple mock auth
      if (passwordInput === 'admin123') {
          setIsAuthenticated(true);
          addToast('Acesso administrativo concedido.', 'success');
      } else {
          addToast('Senha incorreta.', 'error');
      }
  };

  // Derived Data for Filters
  const schoolStats = useMemo(() => {
      const stats: Record<string, number> = {};
      students.forEach(s => {
          const name = s.school || 'Não alocada';
          stats[name] = (stats[name] || 0) + 1;
      });
      return stats;
  }, [students]);

  const schoolNames = useMemo(() => {
      return Object.keys(schoolStats).sort();
  }, [schoolStats]);

  // Extract unique class names from students for filter
  const classNames = useMemo(() => {
      const classes = new Set(students.map(s => s.className).filter(Boolean));
      return Array.from(classes).sort();
  }, [students]);

  // Count unallocated students
  const unallocatedCount = useMemo(() => {
    return students.filter(s => !s.school || s.school === 'Não alocada').length;
  }, [students]);

  // ... (Educacenso Processing - same as before) ...
  const processEducacensoRaw = (text: string) => {
    const lines = text.split(/\r\n|\n/);
    let schoolName = "Escola Municipal";
    let schoolCode = "";
    let city = "Município";
    
    const newStudents: RegistryStudent[] = [];
    let isTableBody = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Nome da escola:')) schoolName = line.split(';').find(p => p && p.trim() !== '' && !p.includes('Nome da escola'))?.trim() || schoolName;
      if (line.includes('Código da escola:')) schoolCode = line.split(';').find(p => p && p.trim() !== '' && !p.includes('Código da escola'))?.trim() || schoolCode;
      if (line.includes('Município:')) city = line.split(';').find(p => p && p.trim() !== '' && !p.includes('Município'))?.trim() || city;

      if (line.includes('Identificação única') && line.includes('Nome')) {
        isTableBody = true;
        continue; 
      }

      if (isTableBody && line.trim() !== '') {
        const cols = line.split(';');
        const id = cols[2]?.trim();
        const name = cols[4]?.trim();
        
        if (id && name) {
            const birthDate = cols[7]?.trim();
            const cpf = cols[9]?.trim();
            const transport = cols[22]?.trim().toLowerCase() === 'sim';
            const enrollmentId = cols[26]?.trim();
            const classId = cols[27]?.trim();
            const className = cols[28]?.trim();
            const grade = cols[31]?.trim() || cols[30]?.trim(); 
            let shift = 'Integral';
            const schedule = cols[34] || '';
            if (schedule.toLowerCase().includes('13:00') || className?.includes('VESPERTINO')) shift = 'Vespertino';
            else if (schedule.toLowerCase().includes('08:00') && !schedule.toLowerCase().includes('17:00') || className?.includes('MATUTINO')) shift = 'Matutino';
            const specialNeedsRaw = cols[15]?.trim();
            const specialNeeds = specialNeedsRaw && specialNeedsRaw !== '--' && specialNeedsRaw !== '';

            newStudents.push({
              id: id,
              enrollmentId: enrollmentId,
              name: name.toUpperCase(),
              birthDate: birthDate,
              cpf: cpf,
              status: 'Matriculado',
              school: schoolName,
              grade: grade,
              className: className,
              classId: classId,
              shift: shift,
              transportRequest: transport,
              specialNeeds: !!specialNeeds,
              transportType: transport ? 'Vans/Kombis' : undefined
            });
        }
      }
    }

    if (newStudents.length > 0) {
        const schoolExists = schools.some(s => s.name === schoolName || s.inep === schoolCode);
        let newSchool: School | null = null;
        
        if (!schoolExists) {
             newSchool = {
                id: schoolCode || Date.now().toString(),
                inep: schoolCode,
                name: schoolName,
                address: `${city} - BA`,
                types: [SchoolType.INFANTIL, SchoolType.FUNDAMENTAL_1],
                image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80',
                rating: 5.0,
                availableSlots: 0,
                lat: -12.5253,
                lng: -40.2917
             };
        }
        return { students: newStudents, school: newSchool };
    }
    return null;
  };

  // ... (Process File Logic - same as before) ...
  const processFile = (file: File) => {
    setIsUploading(true);
    setUploadStatus('idle');
    setFeedbackMessage('');
    setFeedbackDetails([]);
    setUploadProgress(0);
    setPreviewData(null);
    setImportType(null);
    setEducacensoSchool(null);
    setProcessingStage('Iniciando...');

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    reader.onload = (event) => {
      setTimeout(() => {
        try {
          const content = event.target?.result as string;
          
          if (file.name.endsWith('.json')) {
              const parsed = JSON.parse(content);
              
              if (!Array.isArray(parsed) && (parsed.schools || parsed.students)) {
                 if (parsed.schools) updateSchools(parsed.schools);
                 if (parsed.students) updateStudents(parsed.students);
                 setFeedbackMessage('Backup restaurado com sucesso!');
                 addToast('Backup restaurado com sucesso!', 'success');
                 setUploadStatus('success');
              } else if (Array.isArray(parsed) && parsed.length > 0) {
                 const sample = parsed[0];
                 if (sample.nome || sample.name || sample.capacidade || sample.vagas || sample.lat) {
                     setPreviewData(mapSchoolsFromData(parsed));
                     setImportType('schools');
                 } else {
                     setPreviewData(mapStudentsFromData(parsed));
                     setImportType('students');
                 }
              } else {
                 throw new Error("Formato JSON inválido ou vazio.");
              }

          } else if (file.name.endsWith('.csv') || content.includes('Ministério da Educação')) {
              if (content.includes('Ministério da Educação') || content.includes('Educacenso')) {
                  const result = processEducacensoRaw(content);
                  if (result) {
                      setPreviewData(result.students);
                      setImportType('educacenso');
                      setEducacensoSchool(result.school);
                  } else {
                      throw new Error("Nenhum aluno encontrado no arquivo do Educacenso.");
                  }
              } else {
                  const parsedData = parseCSV(content);
                  if (parsedData.length > 0) {
                      const keys = Object.keys(parsedData[0]);
                      const isSchool = keys.some(k => 
                          ['lat', 'latitude', 'capacidade', 'vagas', 'endereco', 'address', 'tipo'].includes(k)
                      );
                      
                      if (isSchool) {
                          setPreviewData(mapSchoolsFromData(parsedData));
                          setImportType('schools');
                      } else {
                          setPreviewData(mapStudentsFromData(parsedData));
                          setImportType('students');
                      }
                  } else {
                      throw new Error("Arquivo CSV vazio ou inválido.");
                  }
              }
          } else {
              throw new Error("Formato não suportado.");
          }
          setProcessingStage('Pronto para importar!');
        } catch (error: any) {
          console.error("Import error:", error);
          setUploadStatus('error');
          setFeedbackMessage(error.message || 'Erro ao ler o arquivo.');
          addToast(error.message || 'Erro ao ler o arquivo.', 'error');
        } finally {
          setIsUploading(false);
        }
      }, 600);
    };

    reader.onerror = () => {
      setUploadStatus('error');
      setFeedbackMessage('Erro de leitura.');
      addToast('Erro de leitura do arquivo.', 'error');
      setIsUploading(false);
    };

    reader.readAsText(file, 'ISO-8859-1');
  };

  const confirmImport = () => {
      if (!previewData) return;

      if (importType === 'schools') {
          updateSchools(previewData as School[]);
          setFeedbackMessage(`${previewData.length} escolas importadas com sucesso.`);
          addToast(`${previewData.length} escolas importadas.`, 'success');
      } else if (importType === 'students') {
          updateStudents(previewData as RegistryStudent[]);
          setFeedbackMessage(`${previewData.length} alunos importados com sucesso.`);
          addToast(`${previewData.length} alunos importados.`, 'success');
      } else if (importType === 'educacenso') {
          if (educacensoSchool) {
              updateSchools([educacensoSchool]);
          }
          updateStudents(previewData as RegistryStudent[]);
          setFeedbackMessage(`${previewData.length} alunos do Educacenso importados.`);
          addToast(`Importação do Educacenso concluída.`, 'success');
      }

      setUploadStatus('success');
      setPreviewData(null);
      setImportType(null);
  };

  const cancelImport = () => {
      setPreviewData(null);
      setImportType(null);
      setUploadStatus('idle');
      setFeedbackMessage('');
      addToast('Importação cancelada.', 'info');
  };

  const handleMassAllocation = () => {
      if (!targetSchoolId) return;
      const school = schools.find(s => s.id === targetSchoolId);
      if (!school) return;

      const unallocated = students.filter(s => !s.school || s.school === 'Não alocada');
      
      const studentsToUpdate = unallocated.map(s => ({ ...s, school: school.name, status: 'Matriculado' as const }));
      updateStudents(studentsToUpdate);

      setAllocationMessage(`${unallocated.length} alunos foram alocados para ${school.name}.`);
      addToast(`${unallocated.length} alunos alocados com sucesso.`, 'success');
      setTimeout(() => setAllocationMessage(''), 5000);
  };

  const executeReset = () => {
    resetData();
    addToast('Todos os dados foram resetados para o padrão.', 'warning');
  };

  // --- Handlers ---
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleBackup = () => {
      const backupData = { students, schools };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `backup_educa_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      // Update backup metadata
      registerBackup();
      
      addToast('Backup baixado com sucesso. Salve em local seguro!', 'success');
  };

  const resetUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  const clearFilters = () => {
      setSearchTerm('');
      setSchoolFilter('Todas');
      setStatusFilter('Todos');
      setClassFilter('Todas');
      setCurrentPage(1);
      setSortConfig(null);
      setSelectedIds(new Set());
  };

  const handleSort = (key: keyof RegistryStudent) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  // --- Selection Logic ---
  
  const toggleSelection = (id: string) => {
      const newSelection = new Set(selectedIds);
      if (newSelection.has(id)) {
          newSelection.delete(id);
      } else {
          newSelection.add(id);
      }
      setSelectedIds(newSelection);
  };

  // --- Filter Logic ---
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const searchLower = searchTerm.toLowerCase().trim();
      const studentName = student.name.toLowerCase();
      const studentCpf = student.cpf ? student.cpf.replace(/\D/g, '') : '';
      const studentSchool = (student.school || '').toLowerCase();

      const matchesSearch = studentName.includes(searchLower) || 
                            studentCpf.includes(searchLower) ||
                            studentSchool.includes(searchLower);
                            
      const matchesSchool = schoolFilter === 'Todas' || student.school === schoolFilter;
      const matchesStatus = statusFilter === 'Todos' || student.status === statusFilter;
      const matchesClass = classFilter === 'Todas' || student.className === classFilter;

      return matchesSearch && matchesSchool && matchesStatus && matchesClass;
    });
  }, [students, searchTerm, schoolFilter, statusFilter, classFilter]);

  // --- Sorting Logic ---
  const sortedStudents = useMemo(() => {
      if (!sortConfig) return filteredStudents;

      return [...filteredStudents].sort((a, b) => {
          let aVal = a[sortConfig.key] || '';
          let bVal = b[sortConfig.key] || '';

          // Normalize for case-insensitive comparison
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();

          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  }, [filteredStudents, sortConfig]);

  // Clear selection when filters change to avoid confusion
  useEffect(() => {
      setSelectedIds(new Set());
  }, [searchTerm, schoolFilter, statusFilter, classFilter]);

  const handleSelectAll = () => {
      if (selectedIds.size === sortedStudents.length && sortedStudents.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(sortedStudents.map(s => s.id)));
      }
  };

  // --- Bulk Action Handlers ---

  const executeBulkAction = (data: any) => {
      if (bulkActionModal.type === 'status') {
          const updatedStudents = students.map(s => {
              if (selectedIds.has(s.id)) {
                  return { ...s, status: data.status };
              }
              return s;
          });
          updateStudents(updatedStudents);
          addToast(`${selectedIds.size} alunos atualizados para "${data.status}".`, 'success');
      } else if (bulkActionModal.type === 'class') {
          const updatedStudents = students.map(s => {
              if (selectedIds.has(s.id)) {
                  return { 
                      ...s, 
                      className: data.className || s.className,
                      grade: data.grade || s.grade,
                      shift: data.shift || s.shift
                  };
              }
              return s;
          });
          updateStudents(updatedStudents);
          addToast(`Turma atribuída para ${selectedIds.size} alunos.`, 'success');
      }
      setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
      // Iterate through selected IDs and remove them
      let count = 0;
      selectedIds.forEach(id => {
          removeStudent(id);
          count++;
      });
      
      addToast(`${count} alunos excluídos com sucesso.`, 'success');
      setSelectedIds(new Set());
  };


  // --- Grouped Classes Logic (for Classes Tab) ---
  const groupedClasses = useMemo(() => {
    const groups: Record<string, { 
      id: string, 
      school: string, 
      className: string, 
      grade: string, 
      shift: string, 
      count: number 
    }> = {};

    filteredStudents.forEach(s => {
      // Use filteredStudents so the class counts reflect the current filters
      const key = `${s.school}_${s.className}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          school: s.school || 'Não alocada',
          className: s.className || 'Sem Turma',
          grade: s.grade || '-',
          shift: s.shift || '-',
          count: 0
        };
      }
      groups[key].count += 1;
    });

    return Object.values(groups).sort((a, b) => 
        a.school.localeCompare(b.school) || a.className.localeCompare(b.className)
    );
  }, [filteredStudents]);

  const handleExportFilteredCSV = () => {
    if (sortedStudents.length === 0) {
        addToast("Nenhum registro para exportar.", 'warning');
        return;
    }

    // Define headers
    const headers = [
        "ID do Sistema", "Nome Completo", "CPF", "Data de Nascimento", "Status da Matrícula", 
        "Escola Alocada", "Turma", "Etapa / Série", "Turno", "Solicitou Transporte?", "Possui Deficiência?", "Protocolo / Matrícula"
    ];

    // Map data from SORTED students
    const rows = sortedStudents.map(s => [
        s.id,
        s.name,
        s.cpf ? `"${s.cpf}"` : '', // Force quotes for CPF to keep formatting if present
        s.birthDate || '',
        s.status,
        s.school || 'Não Alocada',
        s.className || '',
        s.grade || '',
        s.shift || '',
        s.transportRequest ? 'Sim' : 'Não',
        s.specialNeeds ? 'Sim' : 'Não',
        s.enrollmentId ? `"${s.enrollmentId}"` : '' // Force quotes for IDs
    ]);

    // Combine with CSV format (using semicolon for better Excel compatibility in BR)
    const csvContent = [
        headers.join(";"),
        ...rows.map(e => e.map(cell => {
            // Remove extra quotes added above if we are re-quoting, strictly handle existing quotes
            let val = String(cell).replace(/^"|"$/g, ''); 
            return `"${val.replace(/"/g, '""')}"`;
        }).join(";"))
    ].join("\r\n"); // CRLF is safer for Windows Excel

    // Download with BOM for UTF-8 compatibility (fixes accents in Excel)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio_alunos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Arquivo CSV exportado com sucesso.', 'success');
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Sort Icon Component
  const SortIcon = ({ column }: { column: keyof RegistryStudent }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown className="h-3 w-3 text-slate-300 ml-1" />;
      return sortConfig.direction === 'asc' 
          ? <ArrowUp className="h-3 w-3 text-blue-600 ml-1" />
          : <ArrowDown className="h-3 w-3 text-blue-600 ml-1" />;
  };

  const SortableHeader = ({ label, column, className = "" }: { label: string, column: keyof RegistryStudent, className?: string }) => (
      <th 
          className={`px-6 py-3 cursor-pointer hover:bg-slate-200 transition select-none group ${className}`}
          onClick={() => handleSort(column)}
      >
          <div className="flex items-center gap-1">
              {label}
              <SortIcon column={column} />
          </div>
      </th>
  );

  // --- Render Login Overlay if not authenticated ---
  if (!isAuthenticated) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Área Restrita</h2>
                  <p className="text-center text-slate-500 mb-8">Esta área é destinada apenas para gestores autorizados. Por favor, identifique-se.</p>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Código de Acesso</label>
                          <input 
                              type="password" 
                              autoFocus
                              placeholder="••••••••"
                              value={passwordInput}
                              onChange={(e) => setPasswordInput(e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                          />
                      </div>
                      <button 
                          type="submit"
                          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                      >
                          Entrar no Sistema
                      </button>
                  </form>
                  <p className="text-xs text-center text-slate-400 mt-6">
                      Dica para demonstração: a senha é <span className="font-mono bg-slate-100 px-1 rounded">admin123</span>
                  </p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <ConfirmationModal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
        onConfirm={executeReset} 
        title="Zerar Base de Dados"
        message="Tem certeza que deseja apagar todos os alunos e escolas importados? Esta ação não pode ser desfeita e restaurará os dados de demonstração."
        confirmText="Confirmar Exclusão"
      />

      <ConfirmationModal 
        isOpen={bulkActionModal.isOpen && bulkActionModal.type === 'delete'} 
        onClose={() => setBulkActionModal({ ...bulkActionModal, isOpen: false })} 
        onConfirm={handleBulkDelete} 
        title={`Excluir ${selectedIds.size} Alunos?`}
        message="Esta ação removerá permanentemente os alunos selecionados do banco de dados local. Tem certeza?"
        confirmText="Sim, Excluir"
      />

      <BulkActionModal 
        isOpen={bulkActionModal.isOpen && bulkActionModal.type !== 'delete'}
        onClose={() => setBulkActionModal({ ...bulkActionModal, isOpen: false })}
        type={bulkActionModal.type as 'status' | 'class'}
        onConfirm={executeBulkAction}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative pb-24">
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestão de Dados</h1>
            <p className="text-slate-600 mt-2">Importe dados oficiais para popular o sistema.</p>
          </div>
           <button 
              onClick={() => setIsAuthenticated(false)}
              className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1"
           >
              <Lock className="h-3 w-3" /> Sair
           </button>
        </div>

        {/* ... (Import Preview Modal - Code omitted for brevity, logic maintained) ... */}
        {previewData && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Eye className="h-5 w-5 text-blue-600" />
                            Revisão de Importação
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Foram encontrados <strong>{previewData.length}</strong> registros de <strong>{importType === 'schools' ? 'Escolas' : 'Alunos'}</strong>.
                        </p>
                    </div>
                    {/* Simplified preview table rendering for brevity */}
                    <div className="p-0 overflow-auto flex-1 bg-slate-50/30">
                        <table className="w-full text-sm text-left">
                           <thead className="bg-slate-100 text-xs uppercase text-slate-600 font-semibold sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">{importType === 'schools' ? 'Endereço' : 'CPF'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewData.slice(0, 5).map((item, idx) => (
                                    <tr key={idx} className="bg-white">
                                        <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{idx + 1}</td>
                                        <td className="px-4 py-2.5 font-medium">{item.name}</td>
                                        <td className="px-4 py-2.5 text-slate-500">{importType === 'schools' ? item.address : item.cpf}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                        <button onClick={cancelImport} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition">Cancelar</button>
                        <button onClick={confirmImport} className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-200 transition">
                            <Save className="h-4 w-4" />
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          {/* Upload Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Importar Dados</h2>
            </div>
            
            <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition relative flex-1 flex flex-col justify-center items-center min-h-[240px] ${
                    isDragging 
                        ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100 scale-[1.02]' 
                        : uploadStatus === 'error' 
                            ? 'border-red-300 bg-red-50' 
                            : uploadStatus === 'success'
                            ? 'border-green-300 bg-green-50'
                            : 'border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
              {uploadStatus === 'idle' && !isUploading && (
                  <input 
                    type="file" 
                    accept=".json,.csv" 
                    onChange={handleInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
              )}

              {isUploading ? (
                <div className="w-full max-w-xs mx-auto">
                  <div className="relative mb-4">
                    <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
                  </div>
                  <p className="text-blue-700 font-medium mb-2">{processingStage}</p>
                  <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                      style={{ width: `${Math.max(5, uploadProgress)}%` }}
                    >
                         <div className="w-full h-full bg-white/30 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2 text-right font-bold">{uploadProgress}%</p>
                </div>
              ) : uploadStatus === 'success' ? (
                <div className="flex flex-col items-center text-green-700 relative z-20 w-full">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300 shadow-sm">
                      <Check className="h-8 w-8 text-green-600" />
                   </div>
                  <span className="font-bold text-lg">Sucesso!</span>
                  <span className="text-sm mt-1 text-center font-medium px-2">{feedbackMessage}</span>
                  
                  <button 
                    onClick={resetUpload}
                    className="mt-6 px-6 py-2.5 bg-white border border-green-200 text-green-700 rounded-lg text-sm font-bold hover:bg-green-50 transition shadow-sm hover:shadow-md"
                  >
                    Carregar Novo Arquivo
                  </button>
                </div>
              ) : uploadStatus === 'error' ? (
                 <div className="flex flex-col items-center text-red-700 relative z-20 w-full">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300 shadow-sm">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                   </div>
                  <span className="font-bold text-lg mb-2">Falha na Importação</span>
                  <span className="text-sm mt-1 text-center max-w-[250px]">{feedbackMessage}</span>
                  <button 
                    onClick={resetUpload}
                    className="mt-6 px-6 py-2.5 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-bold hover:bg-red-50 transition shadow-sm hover:shadow-md"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-500 pointer-events-none">
                  <div className={`p-4 rounded-full bg-slate-100 mb-4 ${isDragging ? 'scale-110 bg-blue-100 text-blue-600 shadow-md' : ''} transition-all duration-200`}>
                    <Upload className="h-8 w-8" />
                  </div>
                  <span className="font-medium text-slate-700 text-lg mb-1">{isDragging ? 'Solte para enviar' : 'Clique ou arraste aqui'}</span>
                  <span className="text-sm text-slate-400">Suporta .CSV e .JSON</span>
                </div>
              )}
            </div>
          </div>

          {/* Backup & Stats Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                <Database className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Backup e Status</h2>
            </div>
            
            <div className="space-y-4 flex-1">
               <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                   <span className="text-slate-600 font-medium">Alunos</span>
                   <span className="text-2xl font-bold text-slate-900">{students.length}</span>
               </div>
               <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                   <span className="text-slate-600 font-medium">Escolas</span>
                   <span className="text-2xl font-bold text-slate-900">{schools.length}</span>
               </div>
               
               {/* Backup Timestamp */}
               {lastBackupDate && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100 mt-2">
                       <span className="text-xs font-bold text-green-700 uppercase tracking-wide block mb-1">Último Backup Externo</span>
                       <span className="text-sm text-green-900 font-medium flex items-center gap-2">
                           <Check className="h-4 w-4" />
                           {new Date(lastBackupDate).toLocaleString()}
                       </span>
                  </div>
               )}

               {/* Mass Allocation Section */}
               {unallocatedCount > 0 && (
                   <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 mt-4">
                       <div className="flex items-center gap-2 text-yellow-800 font-bold text-sm mb-2">
                           <AlertTriangle className="h-4 w-4" />
                           {unallocatedCount} Alunos sem escola
                       </div>
                       <p className="text-xs text-yellow-700 mb-3">Alunos pendentes de alocação.</p>
                       <div className="flex gap-2">
                            <select 
                                value={targetSchoolId}
                                onChange={(e) => setTargetSchoolId(e.target.value)}
                                className="flex-1 text-xs border border-yellow-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-yellow-500 outline-none"
                            >
                                <option value="">Selecione escola destino...</option>
                                {schools.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleMassAllocation}
                                disabled={!targetSchoolId}
                                className="bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-yellow-700 disabled:opacity-50 transition flex items-center gap-1"
                            >
                                <UserPlus className="h-3 w-3" /> Alocar
                            </button>
                       </div>
                       {allocationMessage && <p className="text-xs text-green-700 mt-2 font-medium">{allocationMessage}</p>}
                   </div>
               )}
            </div>

            <div className="flex flex-col gap-3 mt-6">
                <button onClick={handleBackup} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                    <Download className="h-4 w-4" /> 
                    Fazer Backup de Segurança
                </button>
                <p className="text-xs text-center text-slate-400">Recomendado diariamente.</p>
                <button 
                  onClick={() => setIsResetModalOpen(true)}
                  className="w-full py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm transition font-medium flex items-center justify-center gap-2 mt-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Zerar Dados
                </button>
            </div>
          </div>
        </div>

        {/* Data Table Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            
            {/* Header / Tabs */}
            <div className="bg-slate-50 border-b border-slate-200">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-8 py-5 text-sm font-bold flex items-center gap-2 transition relative ${
                            activeTab === 'students' 
                            ? 'text-blue-600 bg-white' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        <Users className="h-4 w-4" />
                        Visão Geral (Alunos)
                        {activeTab === 'students' && <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`px-8 py-5 text-sm font-bold flex items-center gap-2 transition relative ${
                            activeTab === 'classes' 
                            ? 'text-blue-600 bg-white' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        Visão por Turmas
                        {activeTab === 'classes' && <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                    </button>
                </div>
            </div>

            {/* Filter Controls (Common) */}
            <div className="p-6 border-b border-slate-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
                    <div className="relative flex-grow sm:flex-grow-0 min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nome, CPF ou escola..." 
                            value={searchTerm} 
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    
                    {/* Filter Group */}
                    <div className="flex flex-wrap gap-2">
                         <select 
                            value={schoolFilter} 
                            onChange={(e) => { setSchoolFilter(e.target.value); setCurrentPage(1); }}
                            className="pl-2 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white max-w-[200px]"
                        >
                            <option value="Todas">Escolas: Todas</option>
                            {schoolNames.map(s => (
                                <option key={s} value={s}>{s} ({schoolStats[s] || 0})</option>
                            ))}
                        </select>
                        <select 
                            value={statusFilter} 
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="pl-2 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="Todos">Status: Todos</option>
                            <option value="Matriculado">Matriculado</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Em Análise">Em Análise</option>
                        </select>
                        <select 
                            value={classFilter} 
                            onChange={(e) => { setClassFilter(e.target.value); setCurrentPage(1); }}
                            className="pl-2 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white max-w-[150px]"
                        >
                            <option value="Todas">Turmas: Todas</option>
                            {classNames.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        
                        {(searchTerm || schoolFilter !== 'Todas' || statusFilter !== 'Todos' || classFilter !== 'Todas' || sortConfig) && (
                            <button 
                                onClick={clearFilters}
                                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                                title="Limpar Filtros e Ordenação"
                            >
                                <Eraser className="h-4 w-4" />
                            </button>
                        )}
                        
                        <button
                            onClick={handleExportFilteredCSV}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium"
                            title="Exportar CSV (Respeita filtros e ordenação atual)"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Exportar</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                {activeTab === 'students' ? (
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center">
                                    <button onClick={handleSelectAll} className="flex items-center justify-center text-slate-500 hover:text-blue-600">
                                        {selectedIds.size > 0 && selectedIds.size === sortedStudents.length ? <CheckSquare className="h-5 w-5 text-blue-600" /> : selectedIds.size > 0 ? <MinusSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
                                    </button>
                                </th>
                                <SortableHeader label="Nome" column="name" />
                                <SortableHeader label="CPF" column="cpf" />
                                <SortableHeader label="Escola" column="school" />
                                <SortableHeader label="Turma" column="className" />
                                <SortableHeader label="Status" column="status" />
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.map(s => (
                                <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(s.id) ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-4 py-4 text-center">
                                        <button onClick={() => toggleSelection(s.id)} className="flex items-center justify-center">
                                            {selectedIds.has(s.id) ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-slate-300" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{s.cpf}</td>
                                    <td className="px-6 py-4">{s.school || '-'}</td>
                                    <td className="px-6 py-4">{s.className || '-'}</td>
                                    <td className="px-6 py-4">
                                         <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                            s.status === 'Matriculado' ? 'bg-green-50 text-green-700 border-green-200' :
                                            s.status === 'Pendente' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                        {s.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedStudent(s)}
                                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition"
                                            title="Ver Detalhes"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {currentItems.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-100 text-xs uppercase text-slate-700">
                            <tr>
                                <th className="px-6 py-3">Escola</th>
                                <th className="px-6 py-3">Nome da Turma</th>
                                <th className="px-6 py-3">Etapa / Série</th>
                                <th className="px-6 py-3">Turno</th>
                                <th className="px-6 py-3 text-center">Qtd. Alunos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedClasses.length > 0 ? groupedClasses.map((cls, idx) => (
                                <tr key={cls.id + idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{cls.school}</td>
                                    <td className="px-6 py-4 flex items-center gap-2">
                                        <Layout className="h-4 w-4 text-slate-400" />
                                        {cls.className}
                                    </td>
                                    <td className="px-6 py-4">{cls.grade}</td>
                                    <td className="px-6 py-4">{cls.shift}</td>
                                    <td className="px-6 py-4 text-center">
                                         <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                            {cls.count}
                                         </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma turma encontrada com os filtros atuais.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            
            {/* Bulk Actions Floating Toolbar */}
            {selectedIds.size > 0 && activeTab === 'students' && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-xl shadow-2xl shadow-slate-900/50 py-3 px-6 flex items-center gap-6 animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
                        <span className="bg-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{selectedIds.size}</span>
                        <span className="text-sm font-medium">Selecionados</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => setBulkActionModal({ isOpen: true, type: 'status' })}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-sm font-medium transition"
                        >
                            <Edit3 className="h-4 w-4" />
                            Alterar Status
                        </button>
                        <button 
                            onClick={() => setBulkActionModal({ isOpen: true, type: 'class' })}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-sm font-medium transition"
                        >
                            <Layout className="h-4 w-4" />
                            Atribuir Turma
                        </button>
                        <button 
                            onClick={() => setBulkActionModal({ isOpen: true, type: 'delete' })}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition ml-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                        </button>
                    </div>
                     <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-1 hover:bg-slate-800 rounded-full">
                        <X className="h-4 w-4 text-slate-400" />
                    </button>
                </div>
            )}
            
            {/* Pagination Controls (Only for Students view for now) */}
            {activeTab === 'students' && filteredStudents.length > itemsPerPage && (
                <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
                    <span className="text-xs text-slate-500">Página {currentPage} de {totalPages}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1">{selectedStudent.name}</h2>
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">ID: {selectedStudent.id}</span>
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                selectedStudent.status === 'Matriculado' ? 'bg-green-50 text-green-700 border-green-200' :
                                selectedStudent.status === 'Pendente' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                                {selectedStudent.status}
                            </span>
                        </div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="p-2 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <div className="grid gap-6">
                        {/* Section 1: Personal Data */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <CreditCard className="h-3 w-3" /> Dados Pessoais
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-0.5">CPF</span>
                                    <span className="font-medium text-slate-800 font-mono">{selectedStudent.cpf || "Não informado"}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-0.5">Data de Nascimento</span>
                                    <span className="font-medium text-slate-800 flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-slate-400" />
                                        {selectedStudent.birthDate || "Não informada"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Academic Data */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <SchoolIcon className="h-3 w-3" /> Dados Acadêmicos
                            </h3>
                            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                <div className="p-4 border-b border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-1">Unidade Escolar</span>
                                    <span className="font-bold text-slate-800 text-lg block leading-tight">{selectedStudent.school || "Não Alocada"}</span>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-slate-100">
                                    <div className="p-3">
                                        <span className="text-xs text-slate-500 block mb-0.5">Turma</span>
                                        <span className="font-medium text-slate-800 flex items-center gap-1">
                                            <Layout className="h-3 w-3 text-slate-400" />
                                            {selectedStudent.className || "-"}
                                        </span>
                                    </div>
                                    <div className="p-3">
                                        <span className="text-xs text-slate-500 block mb-0.5">Etapa / Série</span>
                                        <span className="font-medium text-slate-800">{selectedStudent.grade || "-"}</span>
                                    </div>
                                    <div className="p-3 border-t border-slate-100">
                                        <span className="text-xs text-slate-500 block mb-0.5">Turno</span>
                                        <span className="font-medium text-slate-800">{selectedStudent.shift || "-"}</span>
                                    </div>
                                    <div className="p-3 border-t border-slate-100">
                                        <span className="text-xs text-slate-500 block mb-0.5">Matrícula / Protocolo</span>
                                        <span className="font-medium text-slate-800 font-mono text-xs flex items-center gap-1">
                                            <Hash className="h-3 w-3 text-slate-400" />
                                            {selectedStudent.enrollmentId || "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Special Needs & Transport */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <HeartPulse className="h-3 w-3" /> Necessidades e Serviços
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-4 rounded-lg border flex items-start gap-3 ${selectedStudent.transportRequest ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <Bus className={`h-5 w-5 ${selectedStudent.transportRequest ? 'text-green-600' : 'text-slate-400'}`} />
                                    <div>
                                        <span className="block text-xs font-bold uppercase mb-0.5 text-slate-500">Transporte Escolar</span>
                                        <span className={`text-sm font-medium ${selectedStudent.transportRequest ? 'text-green-700' : 'text-slate-600'}`}>
                                            {selectedStudent.transportRequest ? 'Sim, solicitado' : 'Não utiliza'}
                                        </span>
                                        {selectedStudent.transportType && (
                                            <span className="text-xs block mt-1 text-slate-500">{selectedStudent.transportType}</span>
                                        )}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-lg border flex items-start gap-3 ${selectedStudent.specialNeeds ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <HeartPulse className={`h-5 w-5 ${selectedStudent.specialNeeds ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <div>
                                        <span className="block text-xs font-bold uppercase mb-0.5 text-slate-500">Atendimento Especial (AEE)</span>
                                        <span className={`text-sm font-medium ${selectedStudent.specialNeeds ? 'text-blue-700' : 'text-slate-600'}`}>
                                            {selectedStudent.specialNeeds ? 'Sim, possui laudo' : 'Não informado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button 
                        onClick={() => setSelectedStudent(null)}
                        className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition shadow-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};