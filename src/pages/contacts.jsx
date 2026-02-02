import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../components/DataProvider';
import { useDebounce } from '../components/hooks/useDebounce';
import { Contact, ContactCategory } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  Plus,
  Search,
  Settings,
  Trash2,
  Eye,
  Filter,
  Users,
  X,
  Map,
  Building,
  ArrowUpDown,
  Columns3
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ContactDetailsPanel from '../components/contacts/ContactDetailsPanel';
import ContactCategoryManager from '../components/contacts/ContactCategoryManager';
import ContactsSettingsPanel from '../components/contacts/ContactsSettingsPanel';

export default function ContactsPage() {
  const { currentUser, currentCompany } = useData();
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategories, setSelectedCategories] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contacts_selected_categories');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('contacts_selected_categories', JSON.stringify(selectedCategories));
    }
  }, [selectedCategories]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [visibleColumns, setVisibleColumns] = useState({
    avatar: true,
    name: true,
    company: true,
    description: true,
    category: true,
    phone: true,
    email: true,
    location: true,
    map: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsData, categoriesData] = await Promise.all([
        Contact.list('-created_date', 1000),
        ContactCategory.list('sort_order')
      ]);
      setContacts(contactsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query) ||
        contact.description?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.location_name?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(contact => {
        if (selectedCategories.includes('uncategorized')) {
          return !contact.category_id || selectedCategories.includes(contact.category_id);
        }
        return contact.category_id && selectedCategories.includes(contact.category_id);
      });
    }

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [contacts, debouncedSearchQuery, selectedCategories, sortField, sortDirection]);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const toggleAllContacts = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;
    
    if (!confirm(`Delete ${selectedContacts.size} contact(s)? This action cannot be undone.`)) return;

    try {
      toast.info(`Deleting ${selectedContacts.size} contact(s)...`, { id: 'bulk-delete' });
      
      const results = await Promise.allSettled(
        Array.from(selectedContacts).map(id => Contact.delete(id))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const notFoundCount = results.filter(r => r.status === 'rejected' && r.reason?.response?.status === 404).length;
      const failedCount = results.filter(r => r.status === 'rejected' && r.reason?.response?.status !== 404).length;
      
      if (successCount > 0) {
        toast.success(`${successCount} contact(s) deleted successfully`, { id: 'bulk-delete' });
      }
      if (notFoundCount > 0) {
        toast.info(`${notFoundCount} contact(s) already deleted`, { id: 'bulk-delete' });
      }
      if (failedCount > 0) {
        toast.error(`Failed to delete ${failedCount} contact(s)`, { id: 'bulk-delete' });
      }
      
      setSelectedContacts(new Set());
      setIsMultiSelectMode(false);
      await loadData();
    } catch (error) {
      console.error('Failed to delete contacts:', error);
      toast.error('Failed to delete contacts', { id: 'bulk-delete' });
    }
  };

  const categoryCounts = useMemo(() => {
    const counts = {};
    contacts.forEach(contact => {
      const categoryId = contact.category_id;
      if (categoryId) {
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      } else {
        counts['uncategorized'] = (counts['uncategorized'] || 0) + 1;
      }
    });
    return counts;
  }, [contacts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-50 min-h-screen">
      {/* Header Container */}
      <Card className="p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentCompany?.contacts_tab_icon_url ? (
              <img 
                src={currentCompany.contacts_tab_icon_url} 
                alt="Contacts" 
                className="w-10 h-10 object-contain"
              />
            ) : (
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Building className="w-5 h-5 text-cyan-600" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">Contacts Directory</h1>
              <p className="text-sm text-slate-500">Manage your contact list and locations for on field workers</p>
            </div>
          </div>

          {currentUser?.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsPanel(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          )}
        </div>
      </Card>

      {isMultiSelectMode && selectedContacts.size > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 h-8">
            {selectedContacts.size} selected
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            className="text-red-700 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsMultiSelectMode(false);
              setSelectedContacts(new Set());
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category Filter */}
          <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuCheckboxItem
                checked={selectedCategories.includes('uncategorized')}
                onCheckedChange={() => handleCategoryToggle('uncategorized')}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Uncategorized</span>
                  <Badge variant="secondary" className="ml-2">
                    {categoryCounts['uncategorized'] || 0}
                  </Badge>
                </div>
              </DropdownMenuCheckboxItem>

              {categories.map(category => (
                <DropdownMenuCheckboxItem
                  key={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", `bg-${category.color}-500`)}></div>
                      <span>{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {categoryCounts[category.id] || 0}
                    </Badge>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}

              {selectedCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedCategories([])}>
                    <X className="w-4 h-4 mr-2" />
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Select Button - next to search */}
          {currentUser?.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className={cn(isMultiSelectMode && 'bg-violet-50 border-violet-300')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Select
            </Button>
          )}

          <div className="flex-1"></div>

          {/* Add Contact Button */}
          <Button
            onClick={() => setSelectedContact({})}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Button>
        </div>

        {/* Results count */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Showing <span className="font-semibold text-indigo-600">{filteredContacts.length}</span> of{' '}
            <span className="font-semibold">{contacts.length}</span> contacts
          </span>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
          <span className="text-sm font-medium text-slate-700">
            {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Columns3 className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.avatar}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, avatar: checked }))}
              >
                Avatar
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.name}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, name: checked }))}
              >
                Name
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.company}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, company: checked }))}
              >
                Company
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.description}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, description: checked }))}
              >
                Description
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.category}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, category: checked }))}
              >
                Category
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.phone}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, phone: checked }))}
              >
                Phone
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.email}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, email: checked }))}
              >
                Email
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.location}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, location: checked }))}
              >
                Location
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.map}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, map: checked }))}
              >
                Map Link
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {isMultiSelectMode && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                      onCheckedChange={toggleAllContacts}
                    />
                  </TableHead>
                )}
                {visibleColumns.avatar && <TableHead className="w-16"></TableHead>}
                {visibleColumns.name && (
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-indigo-600"
                      onClick={() => {
                        if (sortField === 'name') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('name');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Name
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.company && (
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-indigo-600"
                      onClick={() => {
                        if (sortField === 'company') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('company');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Company
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.description && (
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-indigo-600"
                      onClick={() => {
                        if (sortField === 'description') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('description');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Description
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.category && <TableHead>Category</TableHead>}
                {visibleColumns.phone && (
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-indigo-600"
                      onClick={() => {
                        if (sortField === 'phone') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('phone');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Phone
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.email && (
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-indigo-600"
                      onClick={() => {
                        if (sortField === 'email') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('email');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Email
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.location && (
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-indigo-600"
                      onClick={() => {
                        if (sortField === 'location_name') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('location_name');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Location
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.map && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMultiSelectMode ? 9 : 8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-12 h-12 text-slate-300" />
                      <p className="text-slate-500">No contacts found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedContact({})}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add your first contact
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => {
                  const category = categories.find(c => c.id === contact.category_id);
                  
                  return (
                    <TableRow
                      key={contact.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => !isMultiSelectMode && setSelectedContact(contact)}
                    >
                      {isMultiSelectMode && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedContacts.has(contact.id)}
                            onCheckedChange={() => toggleContactSelection(contact.id)}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.avatar && (
                        <TableCell>
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
                            {contact.avatar_url ? (
                              <img 
                                src={contact.avatar_url} 
                                alt={contact.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `<span class="text-sm font-semibold text-slate-600">${contact.name?.charAt(0) || '?'}</span>`;
                                }}
                              />
                            ) : (
                              <span className="text-sm font-semibold text-slate-600">
                                {contact.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.name && (
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{contact.name}</span>
                            {contact.job_title && (
                              <span className="text-xs text-slate-500">{contact.job_title}</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.company && (
                        <TableCell>
                          {contact.company && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span>{contact.company}</span>
                            </div>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.description && (
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {contact.description || '-'}
                          </p>
                        </TableCell>
                      )}
                      {visibleColumns.category && (
                        <TableCell>
                          {category && (
                            <Badge
                              variant="secondary"
                              className="w-fit text-xs"
                              style={{ backgroundColor: `var(--${category.color}-100)`, color: `var(--${category.color}-700)` }}
                            >
                              {category.name}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.phone && (
                        <TableCell>
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <a
                                href={`tel:${contact.phone}`}
                                className="hover:text-indigo-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {contact.phone}
                              </a>
                            </div>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.email && (
                        <TableCell>
                          {contact.email && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="hover:text-indigo-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.location && (
                        <TableCell>
                          {contact.location_name && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="text-sm">{contact.location_name}</span>
                            </div>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.map && (
                        <TableCell>
                          {contact.latitude && contact.longitude && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `https://www.google.com/maps?q=${contact.latitude},${contact.longitude}`,
                                  '_blank'
                                );
                              }}
                              title="Open in Google Maps"
                            >
                              <Map className="w-4 h-4 text-indigo-600" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Contact Details Panel */}
      {selectedContact && (
        <ContactDetailsPanel
          contact={selectedContact}
          categories={categories}
          onClose={() => setSelectedContact(null)}
          onSave={async () => {
            await loadData();
            setSelectedContact(null);
          }}
          currentUser={currentUser}
        />
      )}

      {/* Category Manager (legacy) */}
      <ContactCategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoriesChanged={loadData}
      />

      {/* Settings Panel */}
      <ContactsSettingsPanel
        isOpen={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        onSettingsChanged={() => {
          loadData();
          window.location.reload();
        }}
        currentCompany={currentCompany}
      />
    </div>
  );
}