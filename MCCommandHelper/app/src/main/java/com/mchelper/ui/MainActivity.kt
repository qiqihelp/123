package com.mchelper.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.search.SearchBar
import com.google.android.material.search.SearchView
import com.google.android.material.tabs.TabLayout
import com.mchelper.R
import com.mchelper.data.Command
import com.mchelper.data.CommandCategory
import com.mchelper.data.CommandRepository

class MainActivity : AppCompatActivity() {
    
    private lateinit var searchBar: SearchBar
    private lateinit var searchView: SearchView
    private lateinit var tabLayout: TabLayout
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: CommandAdapter
    
    private var currentCategory: CommandCategory? = null
    private var searchQuery: String = ""
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initViews()
        setupTabs()
        setupSearch()
        loadCommands()
    }
    
    private fun initViews() {
        searchBar = findViewById(R.id.search_bar)
        searchView = findViewById(R.id.search_view)
        tabLayout = findViewById(R.id.tab_layout)
        recyclerView = findViewById(R.id.recycler_view)
        
        adapter = CommandAdapter { command ->
            showCommandDetail(command)
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter
    }
    
    private fun setupTabs() {
        tabLayout.addTab(tabLayout.newTab().setText("全部"))
        CommandCategory.values().forEach { category ->
            tabLayout.addTab(tabLayout.newTab().setText(category.displayName))
        }
        
        tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                currentCategory = if (tab?.position == 0) null
                else CommandCategory.values().getOrNull(tab!!.position - 1)
                loadCommands()
            }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
    }
    
    private fun setupSearch() {
        searchView.editText.setOnEditorActionListener { _, _, _ ->
            searchQuery = searchView.text.toString()
            loadCommands()
            searchView.hide()
            false
        }
        
        searchBar.setOnMenuItemClickListener { menuItem ->
            if (menuItem.itemId == R.id.action_info) {
                showAboutDialog()
                true
            } else false
        }
    }
    
    private fun loadCommands() {
        val commands = if (searchQuery.isNotEmpty()) {
            CommandRepository.search(searchQuery)
        } else if (currentCategory != null) {
            CommandRepository.getByCategory(currentCategory!!)
        } else {
            CommandRepository.commands
        }
        adapter.submitList(commands)
        searchBar.text = if (searchQuery.isNotEmpty()) searchQuery else "搜索指令..."
    }
    
    private fun showCommandDetail(command: Command) {
        CommandDetailBottomSheet.newInstance(command.id).show(supportFragmentManager, "detail")
    }
    
    private fun showAboutDialog() {
        android.app.AlertDialog.Builder(this)
            .setTitle("MC指令助手")
            .setMessage("版本: 1.0\n\nMinecraft指令查询工具\n支持Java版和基岩版常用指令\n\n点击指令可查看详细用法和示例")
            .setPositiveButton("确定", null)
            .show()
    }
}

class CommandAdapter(
    private val onItemClick: (Command) -> Unit
) : RecyclerView.Adapter<CommandAdapter.ViewHolder>() {
    
    private var items: List<Command> = emptyList()
    
    fun submitList(newItems: List<Command>) {
        items = newItems
        notifyDataSetChanged()
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_command, parent, false)
        return ViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], onItemClick)
    }
    
    override fun getItemCount() = items.size
    
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val iconText: TextView = view.findViewById(R.id.text_icon)
        private val nameText: TextView = view.findViewById(R.id.text_name)
        private val descText: TextView = view.findViewById(R.id.text_description)
        private val categoryText: TextView = view.findViewById(R.id.text_category)
        
        fun bind(command: Command, onClick: (Command) -> Unit) {
            iconText.text = command.category.icon
            nameText.text = command.name
            descText.text = command.description
            categoryText.text = command.category.displayName
            
            itemView.setOnClickListener { onClick(command) }
        }
    }
}
